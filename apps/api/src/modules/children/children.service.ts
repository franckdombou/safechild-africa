import {
  Injectable, NotFoundException,
  ForbiddenException, ConflictException
} from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service' 
import { CreateChildDto, UpdateChildDto, AssociateBraceletDto } from './dto/children.dto'

@Injectable()
export class ChildrenService {
  constructor(private prisma: PrismaService) {}

  // ─── CRÉER UN ENFANT ─────────────────────────────────────
  async create(userId: string, dto: CreateChildDto) {
    // Récupérer le profil parent
    const parent = await this.prisma.parent.findUnique({
      where: { userId },
    })
    if (!parent) throw new NotFoundException('Profil parent introuvable')

    const child = await this.prisma.child.create({
      data: {
        parentId: parent.id,
        firstName: dto.firstName,
        lastName: dto.lastName,
        dateOfBirth: new Date(dto.dateOfBirth),
        gender: dto.gender,
        photoUrl: dto.photoUrl ?? null,
        height: dto.height ?? null,
        weight: dto.weight ?? null,
        skinTone: dto.skinTone ?? null,
        distinctiveSigns: dto.distinctiveSigns ?? null,
        bloodType: dto.bloodType ?? null,
      },
      include: {
        bracelet: true,
        safeZones: true,
      },
    })

    return {
      message: `Enfant ${child.firstName} ajouté avec succès`,
      child,
    }
  }

  // ─── MES ENFANTS ─────────────────────────────────────────
  async findAll(userId: string) {
    const parent = await this.prisma.parent.findUnique({
      where: { userId },
    })
    if (!parent) throw new NotFoundException('Profil parent introuvable')

    const children = await this.prisma.child.findMany({
      where: { parentId: parent.id, isActive: true },
      include: {
        bracelet: true,
        safeZones: true,
        schoolAccesses: {
          where: { status: 'APPROVED' },
          include: { school: true },
        },
        _count: {
          select: { alerts: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return {
      total: children.length,
      children,
    }
  }

  // ─── DÉTAIL D'UN ENFANT ───────────────────────────────────
  async findOne(userId: string, childId: string) {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      include: {
        parent: true,
        bracelet: true,
        safeZones: true,
        routes: { where: { isActive: true } },
        schoolAccesses: {
          include: { school: true },
        },
        alerts: {
          orderBy: { createdAt: 'desc' },
          take: 10,  // 10 dernières alertes
        },
      },
    })

    if (!child) throw new NotFoundException('Enfant introuvable')

    // Vérifier que cet enfant appartient bien à ce parent
    await this.checkOwnership(userId, child)

    return child
  }

  // ─── MODIFIER UN ENFANT ───────────────────────────────────
  async update(userId: string, childId: string, dto: UpdateChildDto) {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      include: { parent: true },
    })

    if (!child) throw new NotFoundException('Enfant introuvable')
    await this.checkOwnership(userId, child)

    const updated = await this.prisma.child.update({
      where: { id: childId },
      data: {
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
        ...(dto.dateOfBirth && { dateOfBirth: new Date(dto.dateOfBirth) }),
        ...(dto.photoUrl !== undefined && { photoUrl: dto.photoUrl }),
        ...(dto.height !== undefined && { height: dto.height }),
        ...(dto.weight !== undefined && { weight: dto.weight }),
        ...(dto.skinTone !== undefined && { skinTone: dto.skinTone }),
        ...(dto.distinctiveSigns !== undefined && { distinctiveSigns: dto.distinctiveSigns }),
        ...(dto.bloodType !== undefined && { bloodType: dto.bloodType }),
      },
      include: { bracelet: true },
    })

    return {
      message: 'Informations mises à jour',
      child: updated,
    }
  }

  // ─── SUPPRIMER UN ENFANT ──────────────────────────────────
  async remove(userId: string, childId: string) {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      include: { parent: true },
    })

    if (!child) throw new NotFoundException('Enfant introuvable')
    await this.checkOwnership(userId, child)

    // Soft delete (désactiver au lieu de supprimer)
    await this.prisma.child.update({
      where: { id: childId },
      data: { isActive: false },
    })

    return { message: `Enfant ${child.firstName} supprimé` }
  }

  // ─── ASSOCIER UN BRACELET ────────────────────────────────
  async associateBracelet(userId: string, childId: string, dto: AssociateBraceletDto) {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      include: { parent: true, bracelet: true },
    })

    if (!child) throw new NotFoundException('Enfant introuvable')
    await this.checkOwnership(userId, child)

    // Vérifier si l'enfant a déjà un bracelet
    if (child.bracelet) {
      throw new ConflictException('Cet enfant a déjà un bracelet associé')
    }

    // Vérifier si le bracelet existe déjà (utilisé par un autre)
    const existingBracelet = await this.prisma.bracelet.findUnique({
      where: { serialNumber: dto.serialNumber },
    })

    if (existingBracelet && existingBracelet.childId) {
      throw new ConflictException('Ce bracelet est déjà associé à un autre enfant')
    }

    let bracelet

    if (existingBracelet) {
      // Mettre à jour le bracelet existant
      bracelet = await this.prisma.bracelet.update({
        where: { id: existingBracelet.id },
        data: {
          childId,
          status: 'ACTIVE',
          activatedAt: new Date(),
        },
      })
    } else {
      // Créer un nouveau bracelet
      bracelet = await this.prisma.bracelet.create({
        data: {
          serialNumber: dto.serialNumber,
          deviceId: dto.deviceId,
          childId,
          status: 'ACTIVE',
          activatedAt: new Date(),
        },
      })
    }

    return {
      message: `Bracelet associé à ${child.firstName} avec succès`,
      bracelet,
    }
  }

  // ─── DISSOCIER UN BRACELET ───────────────────────────────
  async removeBracelet(userId: string, childId: string) {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      include: { parent: true, bracelet: true },
    })

    if (!child) throw new NotFoundException('Enfant introuvable')
    await this.checkOwnership(userId, child)

    if (!child.bracelet) {
      throw new NotFoundException('Aucun bracelet associé à cet enfant')
    }

    await this.prisma.bracelet.update({
      where: { id: child.bracelet.id },
      data: {
        childId: null,
        status: 'INACTIVE',
      },
    })

    return { message: 'Bracelet dissocié avec succès' }
  }

  // ─── HELPER : vérifier que l'enfant appartient au parent ─
  private async checkOwnership(userId: string, child: any) {
    const parent = await this.prisma.parent.findUnique({
      where: { userId },
    })

    if (!parent || child.parent?.userId !== userId) {
      throw new ForbiddenException('Accès refusé à cet enfant')
    }
  }
}