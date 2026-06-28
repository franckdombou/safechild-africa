import { Controller, Post, Get, Body, UseGuards, HttpCode } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto/auth.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { Public } from './decorators/public.decorator'
import { CurrentUser } from './decorators/current-user.decorator'

@ApiTags('Auth')
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Inscription d\'un nouveau parent' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  @Post('login')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Connexion' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }

  @Post('refresh')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Renouveler les tokens' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens('', dto.refreshToken)
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mon profil' })
  getMe(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId)
  }
}