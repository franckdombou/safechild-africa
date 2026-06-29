import {
  Injectable, NotFoundException,
  ConflictException, Logger
} from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service' 
import { AlertsGateway } from '../alerts/alerts.gateway'
import {
  CreateAdminDto, CreateSchoolAdminDto,
  UpdateUserStatusDto, CreateDangerZoneDto,
  SendNotificationDto, UpdateSubscriptionDto,
  PaginationDto
} from './dto/admin.dto'
import * as bcrypt from 'bcrypt'

@Injectable()
export class AdminService {
  private logger = new Logger('AdminService')

  constructor(
    private prisma: PrismaService,
    private alertsGateway: AlertsGateway,
  ) {}

  // ─── DASHBOARD STATS ─────────────────────────────────────
  async getDashboardStats() {
    const [
      totalUsers,
      totalParents,
      totalChildren,
      totalSchools,
      totalBracelets,
      activeBracelets,
      activeAlerts,
      activeMissing,
      totalPayments,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.parent.count(),
      this.prisma.child.count({ where: { isActive: true } }),
      this.prisma.school.count({ where: { status: 'APPROVED' } }),
      this.prisma.bracelet.count(),
      this.prisma.bracelet.count({ where: { status: 'ACTIVE' } }),
      this.prisma.alert.count({ where: { status: 'ACTIVE' } }),
      this.prisma.missingReport.count({ where: { status: 'ACTIVE' } }),
      this.prisma.payment.aggregate({
        where: { status: 'SUCCESS' },
        _sum: { amount: true },
      }),
    ])

    // Inscriptions des 7 derniers jours
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const newUsersThisWeek = await this.prisma.user.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    })

    // Alertes par type
    const alertsByType = await this.prisma.alert.groupBy({
      by: ['type'],
      _count: { type: true },
      orderBy: { _count: { type: 'desc' } },
    })

    return {
      overview: {
        totalUsers,
        totalParents,
        totalChildren,
        totalSchools,
        totalBracelets,
        activeBracelets,
        activeAlerts,
        activeMissing,
        newUsersThisWeek,
        totalRevenue: totalPayments._sum.amount ?? 0,
      },
      alertsByType,
    }
  }

  // ─── GESTION DES UTILISATEURS ────────────────────────────
  async getAllUsers(query: PaginationDto) {
    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const skip = (page - 1) * limit

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        include: {
          parent: {
            include: {
              children: true,
              subscription: true,
            },
          },
          schoolAdmin: {
            include: { school: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ])

    return {
      data: users.map(u => {
        const { passwordHash, ...safe } = u
        return safe
      }),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        parent: {
          include: {
            children: { include: { bracelet: true } },
            subscription: true,
            payments: { orderBy: { createdAt: 'desc' }, take: 5 },
          },
        },
        schoolAdmin: { include: { school: true } },
        auditLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    })

    if (!user) throw new NotFoundException('Utilisateur introuvable')

    const { passwordHash, ...safe } = user
    return safe
  }

  async updateUserStatus(userId: string, dto: UpdateUserStatusDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    })
    if (!user) throw new NotFoundException('Utilisateur introuvable')

    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: dto.isActive },
    })

    // Log l'action
    this.logger.log(
      `User ${userId} ${dto.isActive ? 'activé' : 'suspendu'} - Raison: ${dto.reason}`
    )

    return {
      message: `Utilisateur ${dto.isActive ? 'activé' : 'suspendu'} avec succès`,
    }
  }

  // ─── CRÉER UN ADMIN ──────────────────────────────────────
  async createAdmin(dto: CreateAdminDto) {
    const exists = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    })
    if (exists) throw new ConflictException('Numéro déjà utilisé')

    const passwordHash = await bcrypt.hash(dto.password, 12)

    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        passwordHash,
        role: dto.role,
        isVerified: true,
        isActive: true,
      },
    })

    const { passwordHash: _, ...safe } = user
    return {
      message: `Admin ${user.firstName} créé avec succès`,
      user: safe,
    }
  }

  // ─── CRÉER UN ADMIN ÉCOLE ────────────────────────────────
  async createSchoolAdmin(dto: CreateSchoolAdminDto) {
    const school = await this.prisma.school.findUnique({
      where: { id: dto.schoolId },
    })
    if (!school) throw new NotFoundException('École introuvable')

    const exists = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    })
    if (exists) throw new ConflictException('Numéro déjà utilisé')

    const tempPassword = Math.random().toString(36).slice(-8)
    const passwordHash = await bcrypt.hash(tempPassword, 12)

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          phone: dto.phone,
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          passwordHash,
          role: 'SCHOOL_ADMIN',
          isVerified: true,
          isActive: true,
        },
      })

      await tx.schoolAdmin.create({
        data: {
          userId: newUser.id,
          schoolId: dto.schoolId,
        },
      })

      return newUser
    })

    const { passwordHash: _, ...safe } = user
    return {
      message: `Admin école créé. Mot de passe provisoire : ${tempPassword}`,
      user: safe,
      tempPassword,
    }
  }

  // ─── GESTION DES ÉCOLES ──────────────────────────────────
  async getAllSchools(query: PaginationDto) {
    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const skip = (page - 1) * limit

    const [schools, total] = await Promise.all([
      this.prisma.school.findMany({
        skip,
        take: limit,
        include: {
          admins: { include: { user: true } },
          _count: { select: { schoolAccesses: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.school.count(),
    ])

    return {
      data: schools,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  // ─── GESTION DES BRACELETS ───────────────────────────────
  async getAllBracelets(query: PaginationDto) {
    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const skip = (page - 1) * limit

    const [bracelets, total] = await Promise.all([
      this.prisma.bracelet.findMany({
        skip,
        take: limit,
        include: {
          child: {
            include: {
              parent: { include: { user: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.bracelet.count(),
    ])

    return {
      data: bracelets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async blockBracelet(braceletId: string) {
    const bracelet = await this.prisma.bracelet.findUnique({
      where: { id: braceletId },
    })
    if (!bracelet) throw new NotFoundException('Bracelet introuvable')

    await this.prisma.bracelet.update({
      where: { id: braceletId },
      data: { status: 'INACTIVE' },
    })

    return { message: 'Bracelet bloqué avec succès' }
  }

  // ─── ZONES DANGEREUSES ───────────────────────────────────
  async createDangerZone(dto: CreateDangerZoneDto) {
    const zone = await this.prisma.dangerZone.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        level: dto.level,
        latitude: dto.latitude,
        longitude: dto.longitude,
        radius: dto.radius,
        city: dto.city ?? null,
        isActive: true,
      },
    })

    return {
      message: `Zone dangereuse "${zone.name}" créée`,
      zone,
    }
  }

  async getDangerZones() {
    const zones = await this.prisma.dangerZone.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return { total: zones.length, zones }
  }

  async toggleDangerZone(zoneId: string) {
    const zone = await this.prisma.dangerZone.findUnique({
      where: { id: zoneId },
    })
    if (!zone) throw new NotFoundException('Zone introuvable')

    const updated = await this.prisma.dangerZone.update({
      where: { id: zoneId },
      data: { isActive: !zone.isActive },
    })

    return {
      message: `Zone ${updated.isActive ? 'activée' : 'désactivée'}`,
      zone: updated,
    }
  }

  // ─── NOTIFICATIONS BROADCAST ─────────────────────────────
  async sendBroadcastNotification(dto: SendNotificationDto) {
    // Déterminer les destinataires
    let users: any[] = []

    if (dto.target === 'ALL') {
      users = await this.prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, phone: true },
      })
    } else if (dto.target.startsWith('CITY:')) {
      const city = dto.target.split(':')[1]
      users = await this.prisma.user.findMany({
        where: {
          isActive: true,
          parent: { city },
        },
        select: { id: true, phone: true },
      })
    } else if (dto.target.startsWith('USER:')) {
      const userId = dto.target.split(':')[1]
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, phone: true },
      })
      if (user) users = [user]
    }

    // Créer les notifications en base
    await this.prisma.notification.createMany({
      data: users.map(u => ({
        userId: u.id,
        channel: 'PUSH',
        status: 'PENDING',
        title: dto.title,
        body: dto.body,
        data: dto.data ?? {},
      })),
    })

    // Envoyer via WebSocket (temps réel)
    this.alertsGateway.server?.emit('notification:broadcast', {
      title: dto.title,
      body: dto.body,
      data: dto.data,
      sentAt: new Date(),
    })

    this.logger.log(
      `📢 Notification broadcast envoyée à ${users.length} utilisateurs`
    )

    return {
      message: `Notification envoyée à ${users.length} utilisateurs`,
      total: users.length,
    }
  }

  // ─── GESTION DES ABONNEMENTS ─────────────────────────────
  async updateParentSubscription(
    parentId: string,
    dto: UpdateSubscriptionDto,
  ) {
    const parent = await this.prisma.parent.findUnique({
      where: { id: parentId },
      include: { subscription: true },
    })
    if (!parent) throw new NotFoundException('Parent introuvable')

    const endDate = new Date()
    endDate.setDate(endDate.getDate() + dto.durationDays)

    if (parent.subscription) {
      await this.prisma.subscription.update({
        where: { id: parent.subscription.id },
        data: {
          plan: dto.plan,
          status: 'ACTIVE',
          endDate,
        },
      })
    } else {
      await this.prisma.subscription.create({
        data: {
          parentId: parent.id,
          plan: dto.plan,
          status: 'ACTIVE',
          endDate,
        },
      })
    }

    return {
      message: `Abonnement ${dto.plan} activé pour ${dto.durationDays} jours`,
      endDate,
    }
  }

  // ─── STATISTIQUES FINANCIÈRES ────────────────────────────
  async getFinancialStats() {
    const [
      totalRevenue,
      monthlyRevenue,
      subscriptionsByPlan,
      recentPayments,
    ] = await Promise.all([
      // Revenu total
      this.prisma.payment.aggregate({
        where: { status: 'SUCCESS' },
        _sum: { amount: true },
        _count: true,
      }),

      // Revenu ce mois
      this.prisma.payment.aggregate({
        where: {
          status: 'SUCCESS',
          createdAt: {
            gte: new Date(new Date().setDate(1)), // 1er du mois
          },
        },
        _sum: { amount: true },
      }),

      // Abonnements par plan
      this.prisma.subscription.groupBy({
        by: ['plan', 'status'],
        _count: true,
      }),

      // 10 derniers paiements
      this.prisma.payment.findMany({
        where: { status: 'SUCCESS' },
        include: {
          parent: { include: { user: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ])

    return {
      totalRevenue: totalRevenue._sum.amount ?? 0,
      totalTransactions: totalRevenue._count,
      monthlyRevenue: monthlyRevenue._sum.amount ?? 0,
      subscriptionsByPlan,
      recentPayments,
    }
  }

  // ─── JOURNAL D'AUDIT ─────────────────────────────────────
  async getAuditLogs(query: PaginationDto) {
    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const skip = (page - 1) * limit

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        skip,
        take: limit,
        include: { user: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count(),
    ])

    return {
      data: logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }
  }

  // ─── DISPARITIONS ACTIVES ────────────────────────────────
  async getDashboardAlerts() {
    const [criticalAlerts, missingChildren, sosAlerts] = await Promise.all([
      this.prisma.alert.findMany({
        where: { severity: 'CRITICAL', status: 'ACTIVE' },
        include: {
          child: {
            include: { parent: { include: { user: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),

      this.prisma.missingReport.findMany({
        where: { status: 'ACTIVE' },
        include: {
          child: {
            include: { parent: { include: { user: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),

      this.prisma.alert.findMany({
        where: { type: 'SOS_TRIGGERED', status: 'ACTIVE' },
        include: {
          child: {
            include: { parent: { include: { user: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ])

    return {
      criticalAlerts,
      missingChildren,
      sosAlerts,
      totals: {
        critical: criticalAlerts.length,
        missing: missingChildren.length,
        sos: sosAlerts.length,
      },
    }
  }
}