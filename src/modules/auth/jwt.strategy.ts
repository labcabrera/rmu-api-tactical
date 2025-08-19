/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: configService.get<string>('RMU_IAM_JWK_URI')!,
      }),
      algorithms: ['RS256'],
    });
  }

  validate(payload: any) {
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      username: payload.preferred_username,
      given_name: payload.given_name,
      family_name: payload.family_name,
      roles: payload.realm_access.roles,
    };
  }
}
