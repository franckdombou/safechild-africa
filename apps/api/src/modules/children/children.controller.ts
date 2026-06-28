import {
  Controller, Get, Post, Put, Delete,
  Body, Param, UseGuards
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { ChildrenService } from './children.service'
import { CreateChildDto, UpdateChildDto, AssociateBraceletDto } from './dto/children.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { UserRole } from '@prisma/client'

@ApiTags('Children')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PARENT)
@Controller('children')
export class ChildrenController {
  constructor(private childrenService: ChildrenService) {}

  @Post()
  @ApiOperation({ summary: 'Ajouter un enfant' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateChildDto,
  ) {
    return this.childrenService.create(userId, dto)
  }

  @Get()
  @ApiOperation({ summary: 'Mes enfants' })
  findAll(@CurrentUser('id') userId: string) {
    return this.childrenService.findAll(userId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un enfant' })
  findOne(
    @CurrentUser('id') userId: string,
    @Param('id') childId: string,
  ) {
    return this.childrenService.findOne(userId, childId)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un enfant' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') childId: string,
    @Body() dto: UpdateChildDto,
  ) {
    return this.childrenService.update(userId, childId, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un enfant' })
  remove(
    @CurrentUser('id') userId: string,
    @Param('id') childId: string,
  ) {
    return this.childrenService.remove(userId, childId)
  }

  @Post(':id/bracelet')
  @ApiOperation({ summary: 'Associer un bracelet à un enfant' })
  associateBracelet(
    @CurrentUser('id') userId: string,
    @Param('id') childId: string,
    @Body() dto: AssociateBraceletDto,
  ) {
    return this.childrenService.associateBracelet(userId, childId, dto)
  }

  @Delete(':id/bracelet')
  @ApiOperation({ summary: 'Dissocier le bracelet' })
  removeBracelet(
    @CurrentUser('id') userId: string,
    @Param('id') childId: string,
  ) {
    return this.childrenService.removeBracelet(userId, childId)
  }
}