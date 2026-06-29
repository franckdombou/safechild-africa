import {
  Controller, Get, Post, Put,
  Body, Param, UseGuards
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { AlertsService } from './alerts.service'
import {
  DeclareMissingDto, TriggerSosDto,
  BraceletRemovedDto, UpdatePositionDto
} from './dto/alerts.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Public } from '../auth/decorators/public.decorator'
import { UserRole } from '@prisma/client'

@ApiTags('Alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private alertsService: AlertsService) {}

  // ── PARENT ────────────────────────────────────────────────
  @Get('my')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: '[PARENT] Mes alertes' })
  getMyAlerts(@CurrentUser('id') userId: string) {
    return this.alertsService.getMyAlerts(userId)
  }

  @Put(':id/read')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: '[PARENT] Marquer alerte comme lue' })
  markAsRead(
    @CurrentUser('id') userId: string,
    @Param('id') alertId: string,
  ) {
    return this.alertsService.markAsRead(userId, alertId)
  }

  @Post('missing')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: '[PARENT] Déclarer disparition enfant' })
  declareMissing(
    @CurrentUser('id') userId: string,
    @Body() dto: DeclareMissingDto,
  ) {
    return this.alertsService.declareMissing(userId, dto)
  }

  @Put('missing/:id/close')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: '[PARENT] Enfant retrouvé — clôturer alerte' })
  closeMissing(
    @CurrentUser('id') userId: string,
    @Param('id') reportId: string,
  ) {
    return this.alertsService.closeMissingReport(userId, reportId)
  }

  // ── SUPER ADMIN ───────────────────────────────────────────
  @Get('active')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '[ADMIN] Toutes les alertes actives' })
  getActiveAlerts() {
    return this.alertsService.getActiveAlerts()
  }

  @Get('missing/active')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '[ADMIN] Disparitions actives' })
  getActiveMissingReports() {
    return this.alertsService.getActiveMissingReports()
  }

  // ── BRACELET (appelé par le serveur IoT) ──────────────────
  @Post('bracelet/position')
  @Public()
  @ApiOperation({ summary: '[IoT] Mise à jour position GPS bracelet' })
  updatePosition(@Body() dto: UpdatePositionDto) {
    return this.alertsService.updatePosition(dto)
  }

  @Post('bracelet/removed')
  @Public()
  @ApiOperation({ summary: '[IoT] Bracelet retiré' })
  braceletRemoved(@Body() dto: BraceletRemovedDto) {
    return this.alertsService.braceletRemoved(dto)
  }

  @Post('sos')
  @Public()
  @ApiOperation({ summary: '[IoT] Bouton SOS déclenché' })
  triggerSos(@Body() dto: TriggerSosDto) {
    return this.alertsService.triggerSos(dto)
  }
}