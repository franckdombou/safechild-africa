import {
  IsString, IsOptional, IsEnum,
  IsNumber, IsUUID
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { AlertType, AlertSeverity } from '@prisma/client'

export class CreateAlertDto {
  @ApiProperty()
  @IsUUID()
  childId: string

  @ApiProperty({ enum: AlertType })
  @IsEnum(AlertType)
  type: AlertType

  @ApiProperty({ enum: AlertSeverity })
  @IsEnum(AlertSeverity)
  severity: AlertSeverity

  @ApiProperty()
  @IsString()
  title: string

  @ApiProperty()
  @IsString()
  message: string

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  latitude?: number

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  longitude?: number

  @ApiProperty({ required: false })
  @IsOptional()
  metadata?: any
}

export class DeclareMissingDto {
  @ApiProperty()
  @IsUUID()
  childId: string

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  lastSeenLocation?: string

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string

  @ApiProperty({ required: false, example: 50 })
  @IsNumber()
  @IsOptional()
  amberRadius?: number
}

export class TriggerSosDto {
  @ApiProperty()
  @IsUUID()
  childId: string

  @ApiProperty()
  @IsNumber()
  latitude: number

  @ApiProperty()
  @IsNumber()
  longitude: number
}

export class BraceletRemovedDto {
  @ApiProperty()
  @IsString()
  deviceId: string

  @ApiProperty()
  @IsNumber()
  latitude: number

  @ApiProperty()
  @IsNumber()
  longitude: number
}

export class UpdatePositionDto {
  @ApiProperty()
  @IsString()
  deviceId: string

  @ApiProperty()
  @IsNumber()
  latitude: number

  @ApiProperty()
  @IsNumber()
  longitude: number

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  accuracy?: number

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  battery?: number
}