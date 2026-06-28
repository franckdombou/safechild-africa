import {
  Injectable, NotFoundException,
  ForbiddenException, ConflictException,
  BadRequestException
} from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service' 
import {
  CreateSchoolDto, UpdateSchoolDto,
  SearchSchoolDto, RequestSchoolAccessDto,
  ValidateAccessDto
} from './dto/schools.dto'

@Injectable()
export class SchoolsService {
  constructor(private prisma: PrismaService) {}

  // ─── SUPER ADMIN : Créer une école ───────────────────────
  async create(dto: CreateSchoolDto) {
    const school = await this.prisma.school.create({
      data: {
        name: dto.name,
        type: dto.type,
        registrationNum: dto.registrationNum ?? null,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        website: dto.website ?? null,
        address: dto.address,
        city: dto.city,
        region: dto.region,
        country: dto.country ?? 'CM',
        latitude: dto.latitude,
        longitude: dto.longitude,
        geofence: dto.geofence,
        openTime: dto.openTime ?? '07:30',
        closeTime: dto.closeTime ?? '15:30',
        workDays: dto.workDays ?? ['MON','TUE','WED','THU','FRI'],
        status: 'APPROVED',
      },
    })

    return {
      message: `École "${school.name}" créée avec succès`,
      school,
    }
  }

  // ─── SUPER ADMIN : Modifier une école ────────────────────
  async update(schoolId: string, dto: UpdateSchoolDto) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    })
    if (!school) throw new NotFoundException('École introuvable')

    const updated = await this.prisma.school.update({
      where: { id: schoolId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.address && { address: dto.address }),
        ...(dto.city && { city: dto.city }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.geofence && { geofence: dto.geofence }),
        ...(dto.openTime && { openTime: dto.openTime }),
        ...(dto.closeTime && { closeTime: dto.closeTime }),
        ...(dto.workDays && { workDays: dto.workDays }),
        ...(dto.photoUrl !== undefined && { photoUrl: dto.photoUrl }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
      },
    })

    return { message: 'École mise à jour', school: updated }
  }

  // ─── SUPER ADMIN : Suspendre une école ───────────────────
  async suspend(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    })
    if (!school) throw new NotFoundException('École introuvable')

    await this.prisma.school.update({
      where: { id: schoolId },
      data: { status: 'SUSPENDED' },
    })

    return { message: `École "${school.name}" suspendue` }
  }

  // ─── LISTE DES ÉCOLES (parent + admin) ───────────────────
  async findAll(query: SearchSchoolDto) {
    const schools = await this.prisma.school.findMany({
      where: {
        status: 'APPROVED',
        ...(query.name && {
          name: { contains: query.name, mode: 'insensitive' }
        }),
        ...(query.city && {
          city: { contains: query.city, mode: 'insensitive' }
        }),
        ...(query.type && { type: query.type }),
      },
      include: {
        _count: {
          select: { schoolAccesses: true }
        },
      },
      orderBy: { name: 'asc' },
    })

    return { total: schools.length, schools }
  }

  // ─── DÉTAIL D'UNE ÉCOLE ───────────────────────────────────
  async findOne(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        admins: {
          include: { user: true },
        },
        _count: {
          select: { schoolAccesses: true },
        },
      },
    })

    if (!school) throw new NotFoundException('École introuvable')
    return school
  }

  // ─── PARENT : Demander accès à une école ─────────────────
  async requestAccess(userId: string, schoolId: string, dto: RequestSchoolAccessDto) {
    // Vérifier l'école
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    })
    if (!school) throw new NotFoundException('École introuvable')
    if (school.status !== 'APPROVED') {
      throw new BadRequestException('Cette école n\'est pas disponible')
    }

    // Vérifier que l'enfant appartient au parent
    const parent = await this.prisma.parent.findUnique({
      where: { userId },
    })
    if (!parent) throw new NotFoundException('Profil parent introuvable')

    const child = await this.prisma.child.findFirst({
      where: { id: dto.childId, parentId: parent.id },
    })
    if (!child) throw new ForbiddenException('Enfant introuvable ou accès refusé')

    // Vérifier qu'une demande n'existe pas déjà
    const existing = await this.prisma.schoolAccess.findUnique({
      where: {
        childId_schoolId: {
          childId: dto.childId,
          schoolId,
        },
      },
    })

    if (existing) {
      if (existing.status === 'APPROVED') {
        throw new ConflictException('Cet enfant a déjà accès à cette école')
      }
      if (existing.status === 'PENDING') {
        throw new ConflictException('Une demande est déjà en attente')
      }
      // Si REJECTED ou REVOKED → recréer la demande
      await this.prisma.schoolAccess.delete({
        where: { id: existing.id },
      })
    }

    // Créer la demande d'accès
    const access = await this.prisma.schoolAccess.create({
      data: {
        childId: dto.childId,
        schoolId,
        className: dto.className ?? null,
        status: 'PENDING',
      },
      include: {
        child: true,
        school: true,
      },
    })

    return {
      message: `Demande envoyée à ${school.name}. En attente de validation.`,
      access,
    }
  }

  // ─── ÉCOLE : Valider ou refuser un accès ─────────────────
  async validateAccess(userId: string, dto: ValidateAccessDto) {
    // Vérifier que l'utilisateur est admin de l'école
    const schoolAdmin = await this.prisma.schoolAdmin.findUnique({
      where: { userId },
      include: { school: true },
    })
    if (!schoolAdmin) throw new ForbiddenException('Accès réservé aux admins d\'école')

    const access = await this.prisma.schoolAccess.findUnique({
      where: { id: dto.accessId },
      include: { child: true, school: true },
    })

    if (!access) throw new NotFoundException('Demande introuvable')

    // Vérifier que la demande concerne son école
    if (access.schoolId !== schoolAdmin.schoolId) {
      throw new ForbiddenException('Cette demande ne concerne pas votre école')
    }

    const updated = await this.prisma.schoolAccess.update({
      where: { id: dto.accessId },
      data: {
        status: dto.approved ? 'APPROVED' : 'REJECTED',
        validatedAt: new Date(),
        note: dto.note ?? null,
      },
      include: { child: true, school: true },
    })

    return {
      message: dto.approved
        ? `✅ ${access.child.firstName} validé(e) dans ${access.school.name}`
        : `❌ Demande refusée`,
      access: updated,
    }
  }

  // ─── PARENT : Révoquer l'accès d'une école ───────────────
  async revokeAccess(userId: string, childId: string, schoolId: string) {
    const parent = await this.prisma.parent.findUnique({
      where: { userId },
    })
    if (!parent) throw new NotFoundException('Profil parent introuvable')

    const child = await this.prisma.child.findFirst({
      where: { id: childId, parentId: parent.id },
    })
    if (!child) throw new ForbiddenException('Accès refusé')

    const access = await this.prisma.schoolAccess.findUnique({
      where: { childId_schoolId: { childId, schoolId } },
    })
    if (!access) throw new NotFoundException('Accès introuvable')

    await this.prisma.schoolAccess.update({
      where: { id: access.id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedBy: 'PARENT',
      },
    })

    return { message: 'Accès révoqué avec succès' }
  }

  // ─── ÉCOLE : Liste des élèves présents ───────────────────
  async getStudents(userId: string) {
    const schoolAdmin = await this.prisma.schoolAdmin.findUnique({
      where: { userId },
      include: { school: true },
    })
    if (!schoolAdmin) throw new ForbiddenException('Accès réservé aux admins d\'école')

    const accesses = await this.prisma.schoolAccess.findMany({
      where: {
        schoolId: schoolAdmin.schoolId,
        status: 'APPROVED',
      },
      include: {
        child: {
          include: {
            bracelet: true,
            parent: {
              include: { user: true },
            },
          },
        },
      },
      orderBy: { child: { firstName: 'asc' } },
    })

    return {
      school: schoolAdmin.school.name,
      total: accesses.length,
      students: accesses.map(a => ({
        accessId: a.id,
        className: a.className,
        child: a.child,
        parent: {
          name: `${a.child.parent.user.firstName} ${a.child.parent.user.lastName}`,
          phone: a.child.parent.user.phone,
        },
        braceletStatus: a.child.bracelet?.status ?? 'NO_BRACELET',
        braceletBattery: a.child.bracelet?.batteryLevel ?? null,
      })),
    }
  }

  // ─── ÉCOLE : Demandes en attente ─────────────────────────
  async getPendingRequests(userId: string) {
    const schoolAdmin = await this.prisma.schoolAdmin.findUnique({
      where: { userId },
    })
    if (!schoolAdmin) throw new ForbiddenException('Accès réservé aux admins d\'école')

    const pending = await this.prisma.schoolAccess.findMany({
      where: {
        schoolId: schoolAdmin.schoolId,
        status: 'PENDING',
      },
      include: {
        child: {
          include: {
            parent: { include: { user: true } },
          },
        },
      },
      orderBy: { requestedAt: 'asc' },
    })

    return {
      total: pending.length,
      requests: pending,
    }
  }
}