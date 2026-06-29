import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './modules/auth/auth.module'
import { ChildrenModule } from './modules/children/children.module'
import { SchoolsModule } from './modules/schools/schools.module'
import { AlertsModule } from './modules/alerts/alerts.module'
import { AdminModule } from './modules/admin/admin.module'

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

    // Module Alert
    AlertsModule, 

    //Module admin
    AdminModule,
  ],
})
export class AppModule {}