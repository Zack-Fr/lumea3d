import { Controller, Get, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/shared/decorators/current-user.decorator';

@Controller('debug')
export class DebugController {
  constructor(private configService: ConfigService) {}

  @Get('env')
  getEnvironmentInfo() {
    return {
      NODE_ENV: process.env.NODE_ENV,
      JWT_SECRET_EXISTS: !!process.env.JWT_SECRET,
      JWT_SECRET_LENGTH: process.env.JWT_SECRET?.length || 0,
      JWT_SECRET_FIRST_20: process.env.JWT_SECRET?.substring(0, 20) || 'undefined',
      CONFIG_JWT_SECRET_EXISTS: !!this.configService.get('JWT_SECRET'),
      CONFIG_JWT_SECRET_LENGTH: this.configService.get<string>('JWT_SECRET')?.length || 0,
      CONFIG_JWT_SECRET_FIRST_20: this.configService.get<string>('JWT_SECRET')?.substring(0, 20) || 'undefined',
      PORT: this.configService.get('PORT'),
      DATABASE_URL_EXISTS: !!this.configService.get('DATABASE_URL'),
    };
  }

  @Get('user')
  @UseGuards(AuthGuard('jwt'))
  getCurrentUser(@CurrentUser() user: any) {
    return {
      message: 'JWT authentication working!',
      user: user
    };
  }
}