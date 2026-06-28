import {
  Injectable, ConflictException, UnauthorizedException,
  NotFoundException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from 'src/prisma/prisma.service' 
import { RegisterDto, LoginDto } from './dto/auth.dto'
import * as bcrypt from 'bcrypt'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    // Vérifier si téléphone déjà utilisé
    const exists = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    })
    if (exists) {
      throw new ConflictException('Ce numéro de téléphone est déjà utilisé')
    }

    const passwordHash = await bcrypt.hash(dto.password, 12)

    const user = await this.prisma.$transaction(async (tx) => {
      // 1. Créer l'utilisateur
      const newUser = await tx.user.create({
        data: {
          phone: dto.phone,
          email: dto.email ?? null,
          firstName: dto.firstName,
          lastName: dto.lastName,
          passwordHash,
          role: 'PARENT',
          isVerified: false,
        },
      })

      // 2. Créer le profil parent et récupérer son ID
      const newParent = await tx.parent.create({
        data: {
          userId: newUser.id,
        },
      })

      // 3. Créer abonnement trial avec l'ID du PARENT (pas du user)
      const trialEnd = new Date()
      trialEnd.setDate(trialEnd.getDate() + 30)

      await tx.subscription.create({
        data: {
          parentId: newParent.id,   // ← ID de la table parents
          plan: 'BASIC',
          status: 'TRIAL',
          endDate: trialEnd,
          trialEndsAt: trialEnd,
        },
      })

      return newUser
    })

    const tokens = await this.generateTokens(user.id, user.role, user.phone)

    return {
      message: "Compte créé avec succès. Période d'essai de 30 jours activée.",
      user: this.sanitizeUser(user),
      ...tokens,
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    })

    if (!user) {
      throw new UnauthorizedException('Numéro ou mot de passe incorrect')
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Compte désactivé. Contactez le support.')
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!passwordValid) {
      throw new UnauthorizedException('Numéro ou mot de passe incorrect')
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    const tokens = await this.generateTokens(user.id, user.role, user.phone)

    return {
      message: 'Connexion réussie',
      user: this.sanitizeUser(user),
      ...tokens,
    }
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Accès refusé')
    }

    const tokens = await this.generateTokens(user.id, user.role, user.phone)
    return { message: 'Tokens renouvelés', ...tokens }
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        parent: {
          include: {
            children: {
              include: { bracelet: true },
            },
            subscription: true,
          },
        },
        schoolAdmin: {
          include: { school: true },
        },
      },
    })

    if (!user) throw new NotFoundException('Utilisateur introuvable')

    return this.sanitizeUser(user)
  }

  private async generateTokens(userId: string, role: string, phone: string) {
    const payload = { sub: userId, role, phone }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('JWT_SECRET'),
        expiresIn: this.config.get('JWT_EXPIRES_IN') || '15m',
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') || '7d',
      }),
    ])

    return { accessToken, refreshToken }
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...safeUser } = user
    return safeUser
  }
}