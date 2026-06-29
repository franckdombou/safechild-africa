import {
  Injectable, NotFoundException,
  ForbiddenException, Logger
} from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service' 
import { AlertsGateway } from './alerts.gateway'
import {
  CreateAlertDto, DeclareMissingDto,
  TriggerSosDto, BraceletRemovedDto,
  UpdatePositionDto
} from './dto/alerts.dto'

@Injectable()
export class AlertsService {
  private logger = new Logger('AlertsService')

  constructor(
    private prisma: PrismaService,
    private gateway: AlertsGateway,
  ) {}

  // ─── CRÉER UNE ALERTE ────────────────────────────────────
  async createAlert(dto: CreateAlertDto) {
    const child = await this.prisma.child.findUnique({
      where: { id: dto.childId },
      include: {
        parent: { include: { user: true } },
        bracelet: true,
      },
    })
    if (!child) throw new NotFoundException('Enfant introuvable')

    // Créer l'alerte en base
    const alert = await this.prisma.alert.create({
      data: {
        childId: dto.childId,
        type: dto.type,
        severity: dto.severity,
        title: dto.title,
        message: dto.message,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        metadata: dto.metadata ?? {},
        status: 'ACTIVE',
      },
    })

    // Envoyer en temps réel via WebSocket
    this.gateway.sendAlert(dto.childId, {
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      latitude: alert.latitude,
      longitude: alert.longitude,
      createdAt: alert.createdAt,
    })

    this.logger.log(
      `🔔 Alerte ${alert.type} créée pour ${child.firstName}`
    )

    return alert
  }

  // ─── MISE À JOUR POSITION GPS ────────────────────────────
  async updatePosition(dto: UpdatePositionDto) {
    // Trouver le bracelet et l'enfant associé
    const bracelet = await this.prisma.bracelet.findUnique({
      where: { deviceId: dto.deviceId },
      include: {
        child: {
          include: {
            safeZones: true,
            routes: { where: { isActive: true } },
            schoolAccesses: {
              where: { status: 'APPROVED' },
              include: { school: true },
            },
          },
        },
      },
    })

    if (!bracelet || !bracelet.child) return

    const child = bracelet.child

    // Mettre à jour position du bracelet
    await this.prisma.bracelet.update({
      where: { id: bracelet.id },
      data: {
        lastLatitude: dto.latitude,
        lastLongitude: dto.longitude,
        batteryLevel: dto.battery ?? bracelet.batteryLevel,
        lastSeenAt: new Date(),
      },
    })

    // Envoyer position live via WebSocket
    this.gateway.sendPositionUpdate(child.id, {
      lat: dto.latitude,
      lng: dto.longitude,
      accuracy: dto.accuracy,
      battery: dto.battery,
      timestamp: new Date(),
    })

    // Vérifier les zones sûres
    await this.checkSafeZones(child, dto.latitude, dto.longitude)

    // Vérifier les zones dangereuses
    await this.checkDangerZones(child, dto.latitude, dto.longitude)

    // Vérifier le trajet
    await this.checkRoute(child, dto.latitude, dto.longitude)

    // Alerte batterie faible
    if (dto.battery && dto.battery <= 20) {
      await this.createAlert({
        childId: child.id,
        type: 'LOW_BATTERY',
        severity: dto.battery <= 5 ? 'CRITICAL' : 'WARNING',
        title: '🔋 Batterie faible',
        message: `La batterie du bracelet de ${child.firstName} est à ${dto.battery}%`,
        latitude: dto.latitude,
        longitude: dto.longitude,
      })
    }

    return { success: true }
  }

  // ─── BRACELET RETIRÉ ─────────────────────────────────────
  async braceletRemoved(dto: BraceletRemovedDto) {
    const bracelet = await this.prisma.bracelet.findUnique({
      where: { deviceId: dto.deviceId },
      include: { child: true },
    })

    if (!bracelet || !bracelet.child) return

    const child = bracelet.child

    // Créer alerte critique
    const alert = await this.createAlert({
      childId: child.id,
      type: 'BRACELET_REMOVED',
      severity: 'CRITICAL',
      title: '🚨 Bracelet retiré !',
      message: `Le bracelet de ${child.firstName} vient d'être retiré ou arraché !`,
      latitude: dto.latitude,
      longitude: dto.longitude,
      metadata: {
        deviceId: dto.deviceId,
        lastPosition: { lat: dto.latitude, lng: dto.longitude },
      },
    })

    this.logger.warn(
      `🚨 BRACELET RETIRÉ : ${child.firstName} - Position: ${dto.latitude}, ${dto.longitude}`
    )

    return alert
  }

  // ─── BOUTON SOS ───────────────────────────────────────────
  async triggerSos(dto: TriggerSosDto) {
    const child = await this.prisma.child.findUnique({
      where: { id: dto.childId },
      include: {
        parent: { include: { user: true } },
        bracelet: true,
      },
    })

    if (!child) throw new NotFoundException('Enfant introuvable')

    // Créer alerte SOS
    const alert = await this.createAlert({
      childId: dto.childId,
      type: 'SOS_TRIGGERED',
      severity: 'CRITICAL',
      title: `🆘 SOS — ${child.firstName} a besoin d'aide !`,
      message: `${child.firstName} a appuyé sur le bouton SOS. Intervenez immédiatement !`,
      latitude: dto.latitude,
      longitude: dto.longitude,
    })

    // Envoyer SOS via WebSocket (broadcast global)
    this.gateway.sendSosAlert(dto.childId, {
      child: {
        id: child.id,
        firstName: child.firstName,
        lastName: child.lastName,
        photoUrl: child.photoUrl,
      },
      position: { lat: dto.latitude, lng: dto.longitude },
      parentPhone: child.parent.user.phone,
      timestamp: new Date(),
    })

    this.logger.error(
      `🆘 SOS DÉCLENCHÉ : ${child.firstName} ${child.lastName} - ${dto.latitude}, ${dto.longitude}`
    )

    return {
      message: 'SOS déclenché. Tous les contacts d\'urgence ont été alertés.',
      alert,
    }
  }

  // ─── DÉCLARER DISPARITION ────────────────────────────────
  async declareMissing(userId: string, dto: DeclareMissingDto) {
    // Vérifier que l'enfant appartient au parent
    const parent = await this.prisma.parent.findUnique({
      where: { userId },
    })
    if (!parent) throw new NotFoundException('Profil parent introuvable')

    const child = await this.prisma.child.findFirst({
      where: { id: dto.childId, parentId: parent.id },
      include: { bracelet: true },
    })
    if (!child) throw new ForbiddenException('Enfant introuvable ou accès refusé')

    // Créer le rapport de disparition
    const missingReport = await this.prisma.missingReport.create({
      data: {
        childId: dto.childId,
        status: 'ACTIVE',
        lastSeenAt: new Date(),
        lastSeenLocation: dto.lastSeenLocation ?? null,
        lastLatitude: child.bracelet?.lastLatitude ?? null,
        lastLongitude: child.bracelet?.lastLongitude ?? null,
        description: dto.description ?? null,
        amberRadius: dto.amberRadius ?? 50,
      },
      include: { child: true },
    })

    // Créer alerte CRITICAL
    await this.createAlert({
      childId: dto.childId,
      type: 'CHILD_MISSING',
      severity: 'CRITICAL',
      title: `🔴 DISPARITION — ${child.firstName}`,
      message: `${child.firstName} a été déclaré(e) disparu(e). Alerte communautaire activée.`,
      latitude: child.bracelet?.lastLatitude ?? undefined,
      longitude: child.bracelet?.lastLongitude ?? undefined,
      metadata: { missingReportId: missingReport.id },
    })

    // Déclencher alerte AMBER via WebSocket (tous les utilisateurs)
    this.gateway.sendAmberAlert({
      id: missingReport.id,
      child: {
        id: child.id,
        firstName: child.firstName,
        lastName: child.lastName,
        photoUrl: child.photoUrl,
        gender: child.gender,
        dateOfBirth: child.dateOfBirth,
        distinctiveSigns: child.distinctiveSigns,
      },
      lastPosition: {
        lat: missingReport.lastLatitude,
        lng: missingReport.lastLongitude,
        location: missingReport.lastSeenLocation,
      },
      radius: missingReport.amberRadius,
      declaredAt: missingReport.createdAt,
    })

    this.logger.error(
      `🔴 ALERTE AMBER : ${child.firstName} ${child.lastName} déclaré(e) disparu(e)`
    )

    return {
      message: `🔴 Alerte AMBER déclenchée. ${dto.amberRadius ?? 50}km couverts.`,
      missingReport,
    }
  }

  // ─── CLÔTURER DISPARITION (enfant retrouvé) ──────────────
  async closeMissingReport(userId: string, reportId: string) {
    const parent = await this.prisma.parent.findUnique({
      where: { userId },
    })

    const report = await this.prisma.missingReport.findUnique({
      where: { id: reportId },
      include: { child: true },
    })

    if (!report) throw new NotFoundException('Rapport introuvable')

    const updated = await this.prisma.missingReport.update({
      where: { id: reportId },
      data: {
        status: 'FOUND',
        foundAt: new Date(),
        closedAt: new Date(),
        closingNote: 'Enfant retrouvé',
      },
    })

    // Notifier tous les utilisateurs que l'enfant est retrouvé
    this.gateway.sendAmberAlert({
      type: 'RESOLVED',
      reportId,
      message: `✅ ${report.child.firstName} a été retrouvé(e) !`,
    })

    return {
      message: `✅ ${report.child.firstName} marqué(e) comme retrouvé(e).`,
      report: updated,
    }
  }

  // ─── MES ALERTES ─────────────────────────────────────────
  async getMyAlerts(userId: string) {
    const parent = await this.prisma.parent.findUnique({
      where: { userId },
      include: { children: true },
    })
    if (!parent) throw new NotFoundException('Profil parent introuvable')

    const childIds = parent.children.map(c => c.id)

    const alerts = await this.prisma.alert.findMany({
      where: {
        childId: { in: childIds },
      },
      include: { child: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return {
      total: alerts.length,
      unread: alerts.filter(a => !a.readAt).length,
      alerts,
    }
  }

  // ─── MARQUER ALERTE COMME LUE ────────────────────────────
  async markAsRead(userId: string, alertId: string) {
    const alert = await this.prisma.alert.findUnique({
      where: { id: alertId },
      include: {
        child: {
          include: { parent: true },
        },
      },
    })

    if (!alert) throw new NotFoundException('Alerte introuvable')

    const parent = await this.prisma.parent.findUnique({
      where: { userId },
    })

    if (alert.child.parent.userId !== userId) {
      throw new ForbiddenException('Accès refusé')
    }

    await this.prisma.alert.update({
      where: { id: alertId },
      data: { readAt: new Date(), status: 'ACKNOWLEDGED' },
    })

    return { message: 'Alerte marquée comme lue' }
  }

  // ─── ALERTES ACTIVES (Super Admin) ───────────────────────
  async getActiveAlerts() {
    const alerts = await this.prisma.alert.findMany({
      where: { status: 'ACTIVE' },
      include: {
        child: {
          include: {
            parent: { include: { user: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return { total: alerts.length, alerts }
  }

  // ─── DISPARITIONS ACTIVES ────────────────────────────────
  async getActiveMissingReports() {
    const reports = await this.prisma.missingReport.findMany({
      where: { status: 'ACTIVE' },
      include: {
        child: {
          include: {
            parent: { include: { user: true } },
            bracelet: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return { total: reports.length, reports }
  }

  // ─── HELPERS PRIVÉS ──────────────────────────────────────

  private getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000 // Rayon terre en mètres
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2)
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  private async checkSafeZones(child: any, lat: number, lng: number) {
    for (const zone of child.safeZones) {
      if (!zone.isActive) continue

      const distance = this.getDistance(lat, lng, zone.latitude, zone.longitude)
      const isInZone = distance <= zone.radius

      // Si l'enfant entre dans une zone sûre (école ou maison)
      if (isInZone && zone.type === 'HOME') {
        await this.createAlert({
          childId: child.id,
          type: 'ARRIVED_HOME',
          severity: 'INFO',
          title: '🏠 Arrivée à la maison',
          message: `${child.firstName} est bien rentré(e) à la maison`,
          latitude: lat,
          longitude: lng,
        })
      }
    }
  }

  private async checkDangerZones(child: any, lat: number, lng: number) {
    const dangerZones = await this.prisma.dangerZone.findMany({
      where: { isActive: true },
    })

    for (const zone of dangerZones) {
      const distance = this.getDistance(lat, lng, zone.latitude, zone.longitude)
      if (distance <= zone.radius) {
        await this.createAlert({
          childId: child.id,
          type: 'ENTERED_DANGER_ZONE',
          severity: zone.level === 'RED' ? 'CRITICAL' : 'WARNING',
          title: `⚠️ Zone dangereuse — ${zone.name}`,
          message: `${child.firstName} se trouve dans une zone à risque : ${zone.name}`,
          latitude: lat,
          longitude: lng,
        })
      }
    }
  }

  private async checkRoute(child: any, lat: number, lng: number) {
    for (const route of child.routes) {
      const waypoints = route.waypoints as any[]
      if (!waypoints?.length) continue

      // Calculer distance minimale au trajet
      let minDistance = Infinity
      for (const point of waypoints) {
        const d = this.getDistance(lat, lng, point.lat, point.lng)
        if (d < minDistance) minDistance = d
      }

      // Si déviation > tolérance configurée
      if (minDistance > route.tolerance) {
        await this.createAlert({
          childId: child.id,
          type: 'ROUTE_DEVIATION',
          severity: 'WARNING',
          title: '⚠️ Déviation de trajet',
          message: `${child.firstName} s'écarte du trajet habituel (${Math.round(minDistance)}m)`,
          latitude: lat,
          longitude: lng,
          metadata: { deviation: Math.round(minDistance), routeId: route.id },
        })
        break
      }
    }
  }
}