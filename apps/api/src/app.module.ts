import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './modules/auth/auth.module'
import { ChildrenModule } from './modules/children/children.module'
import { SchoolsModule } from './modules/schools/schools.module'

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

    // Module children
    ChildrenModule,

    // Module school
    SchoolsModule,
  ],
})
export class AppModule {}