import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, UseGuards
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { AdminService } from './admin.service'
import {
  CreateAdminDto, CreateSchoolAdminDto,
  UpdateUserStatusDto, CreateDangerZoneDto,
  SendNotificationDto, UpdateSubscriptionDto,
  PaginationDto
} from './dto/admin.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '@prisma/client'

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  // ── DASHBOARD ─────────────────────────────────────────────
  @Get('dashboard')
  @ApiOperation({ summary: 'Stats dashboard principal' })
  getDashboard() {
    return this.adminService.getDashboardStats()
  }

  @Get('dashboard/alerts')
  @ApiOperation({ summary: 'Alertes critiques dashboard' })
  getDashboardAlerts() {
    return this.adminService.getDashboardAlerts()
  }

  // ── UTILISATEURS ──────────────────────────────────────────
  @Get('users')
  @ApiOperation({ summary: 'Liste tous les utilisateurs' })
  getAllUsers(@Query() query: PaginationDto) {
    return this.adminService.getAllUsers(query)
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Détail d\'un utilisateur' })
  getUser(@Param('id') id: string) {
    return this.adminService.getUserById(id)
  }

  @Put('users/:id/status')
  @ApiOperation({ summary: 'Activer/Suspendre un utilisateur' })
  updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(id, dto)
  }

  // ── ADMINS ────────────────────────────────────────────────
  @Post('admins')
  @ApiOperation({ summary: 'Créer un Super Admin' })
  createAdmin(@Body() dto: CreateAdminDto) {
    return this.adminService.createAdmin(dto)
  }

  @Post('admins/school')
  @ApiOperation({ summary: 'Créer un Admin École' })
  createSchoolAdmin(@Body() dto: CreateSchoolAdminDto) {
    return this.adminService.createSchoolAdmin(dto)
  }

  // ── ÉCOLES ────────────────────────────────────────────────
  @Get('schools')
  @ApiOperation({ summary: 'Liste toutes les écoles' })
  getAllSchools(@Query() query: PaginationDto) {
    return this.adminService.getAllSchools(query)
  }

  // ── BRACELETS ─────────────────────────────────────────────
  @Get('bracelets')
  @ApiOperation({ summary: 'Liste tous les bracelets' })
  getAllBracelets(@Query() query: PaginationDto) {
    return this.adminService.getAllBracelets(query)
  }

  @Put('bracelets/:id/block')
  @ApiOperation({ summary: 'Bloquer un bracelet' })
  blockBracelet(@Param('id') id: string) {
    return this.adminService.blockBracelet(id)
  }

  // ── ZONES DANGEREUSES ─────────────────────────────────────
  @Post('danger-zones')
  @ApiOperation({ summary: 'Créer une zone dangereuse' })
  createDangerZone(@Body() dto: CreateDangerZoneDto) {
    return this.adminService.createDangerZone(dto)
  }

  @Get('danger-zones')
  @ApiOperation({ summary: 'Liste des zones dangereuses' })
  getDangerZones() {
    return this.adminService.getDangerZones()
  }

  @Put('danger-zones/:id/toggle')
  @ApiOperation({ summary: 'Activer/Désactiver zone dangereuse' })
  toggleDangerZone(@Param('id') id: string) {
    return this.adminService.toggleDangerZone(id)
  }

  // ── NOTIFICATIONS ─────────────────────────────────────────
  @Post('notifications/broadcast')
  @ApiOperation({ summary: 'Envoyer notification à tous' })
  sendBroadcast(@Body() dto: SendNotificationDto) {
    return this.adminService.sendBroadcastNotification(dto)
  }

  // ── ABONNEMENTS ───────────────────────────────────────────
  @Put('subscriptions/:parentId')
  @ApiOperation({ summary: 'Modifier abonnement d\'un parent' })
  updateSubscription(
    @Param('parentId') parentId: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.adminService.updateParentSubscription(parentId, dto)
  }

  // ── FINANCES ──────────────────────────────────────────────
  @Get('finances')
  @ApiOperation({ summary: 'Stats financières' })
  getFinancialStats() {
    return this.adminService.getFinancialStats()
  }

  // ── AUDIT ─────────────────────────────────────────────────
  @Get('audit-logs')
  @ApiOperation({ summary: 'Journal d\'audit' })
  getAuditLogs(@Query() query: PaginationDto) {
    return this.adminService.getAuditLogs(query)
  }
}