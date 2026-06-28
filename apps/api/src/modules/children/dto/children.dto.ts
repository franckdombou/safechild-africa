import {
  IsString, IsOptional, IsEnum,
  IsDateString, IsNumber, Min, Max
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { Gender } from '@prisma/client'

export class CreateChildDto {
  @ApiProperty({ example: 'Léa' })
  @IsString()
  firstName: string

  @ApiProperty({ example: 'Kamga' })
  @IsString()
  lastName: string

  @ApiProperty({ example: '2018-05-15' })
  @IsDateString()
  dateOfBirth: string

  @ApiProperty({ enum: Gender })
  @IsEnum(Gender)
  gender: Gender

  @ApiProperty({ example: 'https://...', required: false })
  @IsString()
  @IsOptional()
  photoUrl?: string

  @ApiProperty({ example: 115, required: false })
  @IsNumber()
  @IsOptional()
  height?: number

  @ApiProperty({ example: 20, required: false })
  @IsNumber()
  @IsOptional()
  weight?: number

  @ApiProperty({ example: 'Clair', required: false })
  @IsString()
  @IsOptional()
  skinTone?: string

  @ApiProperty({ example: 'Cicatrice genou gauche', required: false })
  @IsString()
  @IsOptional()
  distinctiveSigns?: string

  @ApiProperty({ example: 'O+', required: false })
  @IsString()
  @IsOptional()
  bloodType?: string
}

export class UpdateChildDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  firstName?: string

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  lastName?: string

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  photoUrl?: string

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  height?: number

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  weight?: number

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  skinTone?: string

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  distinctiveSigns?: string

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  bloodType?: string
}

export class AssociateBraceletDto {
  @ApiProperty({ example: 'SC-2024-A7F2' })
  @IsString()
  serialNumber: string

  @ApiProperty({ example: 'DEVICE-001' })
  @IsString()
  deviceId: string
}