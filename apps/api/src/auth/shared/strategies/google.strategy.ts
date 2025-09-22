import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { AuthService } from '../../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    
    // Skip initialization if OAuth is not configured (for development/staging)
    if (!clientID || !clientSecret || clientID.startsWith('disabled-oauth')) {
      console.log('⚠️ Google OAuth not configured - GoogleStrategy disabled');
      // Use dummy values to prevent OAuth2Strategy error
      super({
        clientID: 'dummy-client-id',
        clientSecret: 'dummy-client-secret',
        callbackURL: 'http://localhost:3000/auth/google/callback',
        scope: ['email', 'profile'],
      });
      return;
    }
    
    console.log('🔧 Google OAuth configured - GoogleStrategy enabled');
    super({
      clientID,
      clientSecret,
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL', 'http://localhost:3000/auth/google/callback'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<any> {
    const { emails, displayName, photos } = profile;
    
    if (!emails || emails.length === 0) {
      throw new Error('No email found in Google profile');
    }

    const email = emails[0].value;
    const name = displayName || email.split('@')[0];

    // Try to find or create user
    const user = await this.authService.findOrCreateGoogleUser({
      email,
      displayName: name,
      googleId: profile.id,
      avatar: photos?.[0]?.value,
    });

    return user;
  }}