import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config'; // Import ConfigModule and ConfigService
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaService } from 'src/prisma.service';
import { UserService } from 'src/user/user.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    // Import ConfigModule to access environment variables
    ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigModule available globally without importing in every module
    }),

    PassportModule,

    // JwtModule is configured asynchronously to inject ConfigService for dynamic values
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || '123', // Use ConfigService to fetch JWT secret
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [AuthService, PrismaService, UserService],
  controllers: [AuthController],
})
export class AuthModule {}
