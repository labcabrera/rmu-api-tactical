import { Module } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy.js';
import { TokenService } from './token.service.js';

@Module({
  providers: [JwtStrategy, TokenService],
  exports: [TokenService],
})
export class AuthModule {}
