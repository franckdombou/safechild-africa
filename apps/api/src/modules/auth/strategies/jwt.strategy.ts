import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from 'src/prisma/prisma.service' 

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    const secret = config.get<string>('JWT_SECRET')
    if (!secret) throw new Error('JWT_SECRET manquant dans .env')

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
      ignoreExpiration: false,
    })
  }

  async validate(payload: { sub: string; role: string; phone: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    })

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Compte invalide ou désactivé')
    }

    return user
  }
}