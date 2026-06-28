import {
  IsString, IsEmail, IsOptional,
  MinLength, IsPhoneNumber, IsEnum
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { UserRole } from '@prisma/client'

export class RegisterDto {
  @ApiProperty({ example: '+237699000000' })
  @IsPhoneNumber()
  phone: string

  @ApiProperty({ example: 'Jean' })
  @IsString()
  firstName: string

  @ApiProperty({ example: 'Kamga' })
  @IsString()
  lastName: string

  @ApiProperty({ example: 'jean@email.com', required: false })
  @IsEmail()
  @IsOptional()
  email?: string

  @ApiProperty({ example: 'motdepasse123' })
  @IsString()
  @MinLength(6)
  password: string
}

export class LoginDto {
  @ApiProperty({ example: '+237699000000' })
  @IsString()
  phone: string

  @ApiProperty({ example: 'motdepasse123' })
  @IsString()
  password: string
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string
}

export class VerifyOtpDto {
  @ApiProperty({ example: '+237699000000' })
  @IsString()
  phone: string

  @ApiProperty({ example: '123456' })
  @IsString()
  otp: string
}