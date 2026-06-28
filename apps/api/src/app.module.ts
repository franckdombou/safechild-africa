import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './modules/auth/auth.module'

@Module({
  imports: [
    // Config globale (.env accessible partout)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Base de données
    PrismaModule,

    // Modules fonctionnels
    AuthModule,
  ],
})
export class AppModule {}