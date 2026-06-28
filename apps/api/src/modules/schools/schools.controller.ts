import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, UseGuards
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { SchoolsService } from './schools.service'
import {
  CreateSchoolDto, UpdateSchoolDto,
  SearchSchoolDto, RequestSchoolAccessDto,
  ValidateAccessDto
} from './dto/schools.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { UserRole } from '@prisma/client'

@ApiTags('Schools')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('schools')
export class SchoolsController {
  constructor(private schoolsService: SchoolsService) {}

  // ── SUPER ADMIN ──────────────────────────────────────────
  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '[ADMIN] Créer une école' })
  create(@Body() dto: CreateSchoolDto) {
    return this.schoolsService.create(dto)
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '[ADMIN] Modifier une école' })
  update(@Param('id') id: string, @Body() dto: UpdateSchoolDto) {
    return this.schoolsService.update(id, dto)
  }

  @Put(':id/suspend')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '[ADMIN] Suspendre une école' })
  suspend(@Param('id') id: string) {
    return this.schoolsService.suspend(id)
  }

  // ── PUBLIC (parent + admin) ───────────────────────────────
  @Get()
  @Roles(UserRole.PARENT, UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Rechercher des écoles' })
  findAll(@Query() query: SearchSchoolDto) {
    return this.schoolsService.findAll(query)
  }

  @Get('students')
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: '[ÉCOLE] Liste des élèves' })
  getStudents(@CurrentUser('id') userId: string) {
    return this.schoolsService.getStudents(userId)
  }

  @Get('requests/pending')
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: '[ÉCOLE] Demandes en attente' })
  getPendingRequests(@CurrentUser('id') userId: string) {
    return this.schoolsService.getPendingRequests(userId)
  }

  @Get(':id')
  @Roles(UserRole.PARENT, UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Détail d\'une école' })
  findOne(@Param('id') id: string) {
    return this.schoolsService.findOne(id)
  }

  // ── PARENT : Accès école ──────────────────────────────────
  @Post(':id/request-access')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: '[PARENT] Demander accès à une école' })
  requestAccess(
    @CurrentUser('id') userId: string,
    @Param('id') schoolId: string,
    @Body() dto: RequestSchoolAccessDto,
  ) {
    return this.schoolsService.requestAccess(userId, schoolId, dto)
  }

  @Delete(':schoolId/children/:childId/revoke')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: '[PARENT] Révoquer accès école' })
  revokeAccess(
    @CurrentUser('id') userId: string,
    @Param('childId') childId: string,
    @Param('schoolId') schoolId: string,
  ) {
    return this.schoolsService.revokeAccess(userId, childId, schoolId)
  }

  // ── ÉCOLE : Validation ────────────────────────────────────
  @Post('access/validate')
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: '[ÉCOLE] Valider/refuser demande élève' })
  validateAccess(
    @CurrentUser('id') userId: string,
    @Body() dto: ValidateAccessDto,
  ) {
    return this.schoolsService.validateAccess(userId, dto)
  }
}