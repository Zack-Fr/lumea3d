import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './shared/strategies/jwt.strategy';
import { GoogleStrategy } from './shared/strategies/google.strategy';
import { PrismaModule } from '../../prisma/prisma.module';

/**
 * Authentication Module
 * Configures JWT, Passport strategies, and exports auth services
 */
@Module({
  imports: [
    PassportModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN', '15m');
        
        console.log('🔧 AuthModule JWT Config:');
        console.log('JWT_SECRET loaded successfully:', !!secret);
        console.log('JWT_SECRET length:', secret?.length || 0);
        console.log('JWT_EXPIRES_IN:', expiresIn);
        
        if (!secret) {
          throw new Error('JWT_SECRET is not defined in environment variables');
        }
        
        return {
          secret,
          signOptions: {
            expiresIn,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtStrategy, GoogleStrategy],
  controllers: [AuthController],
})
export class AuthModule {}