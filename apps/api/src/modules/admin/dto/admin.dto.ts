import {
  IsString, IsOptional, IsEnum,
  IsEmail, IsBoolean, IsNumber,
  IsUUID, Min, Max
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { UserRole, SubscriptionPlan, DangerLevel } from '@prisma/client'

export class CreateAdminDto {
  @ApiProperty({ example: '+237699000002' })
  @IsString()
  phone: string

  @ApiProperty({ example: 'Admin' })
  @IsString()
  firstName: string

  @ApiProperty({ example: 'SafeChild' })
  @IsString()
  lastName: string

  @ApiProperty({ example: 'admin@safechild.africa' })
  @IsEmail()
  email: string

  @ApiProperty({ example: 'admin_secure_password' })
  @IsString()
  password: string

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole
}

export class CreateSchoolAdminDto {
  @ApiProperty({ example: '+237699000003' })
  @IsString()
  phone: string

  @ApiProperty({ example: 'Directeur' })
  @IsString()
  firstName: string

  @ApiProperty({ example: 'Mbarga' })
  @IsString()
  lastName: string

  @ApiProperty({ example: 'directeur@saintemarie.cm' })
  @IsEmail()
  email: string

  @ApiProperty({ example: 'school_uuid_here' })
  @IsUUID()
  schoolId: string
}

export class UpdateUserStatusDto {
  @ApiProperty()
  @IsBoolean()
  isActive: boolean

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  reason?: string
}

export class CreateDangerZoneDto {
  @ApiProperty({ example: 'Zone inondable Bonapriso' })
  @IsString()
  name: string

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string

  @ApiProperty({ enum: DangerLevel })
  @IsEnum(DangerLevel)
  level: DangerLevel

  @ApiProperty({ example: 4.0483 })
  @IsNumber()
  latitude: number

  @ApiProperty({ example: 9.7043 })
  @IsNumber()
  longitude: number

  @ApiProperty({ example: 500 })
  @IsNumber()
  radius: number

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  city?: string
}

export class SendNotificationDto {
  @ApiProperty({ example: 'Maintenance programmée' })
  @IsString()
  title: string

  @ApiProperty({ example: 'Le service sera indisponible de 2h à 4h' })
  @IsString()
  body: string

  @ApiProperty({
    example: 'ALL',
    description: 'ALL | CITY:Douala | USER:uuid'
  })
  @IsString()
  target: string

  @ApiProperty({ required: false })
  @IsOptional()
  data?: any
}

export class UpdateSubscriptionDto {
  @ApiProperty({ enum: SubscriptionPlan })
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan

  @ApiProperty({ example: 30 })
  @IsNumber()
  @Min(1)
  @Max(365)
  durationDays: number
}

export class PaginationDto {
  @ApiProperty({ required: false, default: 1 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number = 1

  @ApiProperty({ required: false, default: 20 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number = 20
}