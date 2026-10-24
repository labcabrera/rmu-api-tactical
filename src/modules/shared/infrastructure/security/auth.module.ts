import { Module } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { TokenService } from './token.service';

@Module({
  providers: [JwtStrategy, TokenService],
  exports: [TokenService],
})
export class AuthModule {}
