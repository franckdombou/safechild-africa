import {
  IsString, IsOptional, IsEnum, IsNumber,
  IsArray, IsBoolean, Min, Max, IsEmail, IsUrl
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { SchoolType } from '@prisma/client'

export class CreateSchoolDto {
  @ApiProperty({ example: 'École Primaire Sainte Marie' })
  @IsString()
  name: string

  @ApiProperty({ enum: SchoolType })
  @IsEnum(SchoolType)
  type: SchoolType

  @ApiProperty({ example: 'PSM-2024-001', required: false })
  @IsString()
  @IsOptional()
  registrationNum?: string

  @ApiProperty({ example: '+237699000001', required: false })
  @IsString()
  @IsOptional()
  phone?: string

  @ApiProperty({ example: 'contact@saintemarie.cm', required: false })
  @IsEmail()
  @IsOptional()
  email?: string

  @ApiProperty({ example: 'https://saintemarie.cm', required: false })
  @IsString()
  @IsOptional()
  website?: string

  @ApiProperty({ example: 'Rue de la Paix, Akwa' })
  @IsString()
  address: string

  @ApiProperty({ example: 'Douala' })
  @IsString()
  city: string

  @ApiProperty({ example: 'Littoral' })
  @IsString()
  region: string

  @ApiProperty({ example: 'CM', required: false })
  @IsString()
  @IsOptional()
  country?: string

  @ApiProperty({ example: 4.0483 })
  @IsNumber()
  latitude: number

  @ApiProperty({ example: 9.7043 })
  @IsNumber()
  longitude: number

  @ApiProperty({
    example: {
      type: 'circle',
      center: { lat: 4.0483, lng: 9.7043 },
      radius: 150
    }
  })
  geofence: any

  @ApiProperty({ example: '07:30', required: false })
  @IsString()
  @IsOptional()
  openTime?: string

  @ApiProperty({ example: '15:30', required: false })
  @IsString()
  @IsOptional()
  closeTime?: string

  @ApiProperty({
    example: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
    required: false
  })
  @IsArray()
  @IsOptional()
  workDays?: string[]
}

export class UpdateSchoolDto {
  @IsString() @IsOptional() name?: string
  @IsString() @IsOptional() phone?: string
  @IsEmail()  @IsOptional() email?: string
  @IsString() @IsOptional() address?: string
  @IsString() @IsOptional() city?: string
  @IsNumber() @IsOptional() latitude?: number
  @IsNumber() @IsOptional() longitude?: number
  @IsOptional() geofence?: any
  @IsString() @IsOptional() openTime?: string
  @IsString() @IsOptional() closeTime?: string
  @IsArray()  @IsOptional() workDays?: string[]
  @IsString() @IsOptional() photoUrl?: string
  @IsString() @IsOptional() logoUrl?: string
}

export class SearchSchoolDto {
  @ApiProperty({ example: 'Sainte Marie', required: false })
  @IsString()
  @IsOptional()
  name?: string

  @ApiProperty({ example: 'Douala', required: false })
  @IsString()
  @IsOptional()
  city?: string

  @ApiProperty({ enum: SchoolType, required: false })
  @IsEnum(SchoolType)
  @IsOptional()
  type?: SchoolType
}

export class RequestSchoolAccessDto {
  @ApiProperty({ example: 'child-uuid-here' })
  @IsString()
  childId: string

  @ApiProperty({ example: 'CM1-A', required: false })
  @IsString()
  @IsOptional()
  className?: string
}

export class ValidateAccessDto {
  @ApiProperty({ example: 'access-request-uuid' })
  @IsString()
  accessId: string

  @ApiProperty({ example: true })
  @IsBoolean()
  approved: boolean

  @ApiProperty({ example: 'Élève non inscrit', required: false })
  @IsString()
  @IsOptional()
  note?: string
}