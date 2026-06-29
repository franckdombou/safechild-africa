import { Module } from '@nestjs/common'
import { AlertsService } from './alerts.service'
import { AlertsController } from './alerts.controller'
import { AlertsGateway } from './alerts.gateway'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [AuthModule],
  controllers: [AlertsController],
  providers: [AlertsService, AlertsGateway],
  exports: [AlertsService, AlertsGateway],
})
export class AlertsModule {}