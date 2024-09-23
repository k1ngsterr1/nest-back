import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcryptjs from 'bcryptjs';
import { PrismaService } from 'src/prisma.service';
import { UserService } from 'src/user/user.service';
import { generateUniqueReferralCode } from 'src/utils/generateReferralCode';
import { LoginDto, RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<void> {
    const { username, email, password, refCode } = registerDto;

    if (await this.userService.findByEmail(email)) {
      throw new HttpException('Email already in use', HttpStatus.BAD_REQUEST);
    }

    if (await this.userService.findByUsername(username)) {
      throw new HttpException(
        'Username already in use',
        HttpStatus.BAD_REQUEST,
      );
    }

    const userRefCode = await generateUniqueReferralCode(this.prisma);
    const hashedPassword = await bcryptjs.hash(password, 10);

    await this.userService.createUser({
      username,
      email,
      password: hashedPassword,
      refCode: userRefCode,
      invitedBy: refCode || null,
    });
  }

  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;

    const user = await this.userService.findByUsernameOrEmail(username);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.UNAUTHORIZED);
    }

    // ! Validation FIX
    // const isPasswordValid = await bcryptjs.compare(password, user.password);

    // if (!isPasswordValid) {
    //   throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    // }

    const accessToken = this.jwtService.sign(
      { sub: user.id, username: user.username },
      { secret: process.env.JWT_ACCESS_SECRET || '123', expiresIn: '1h' },
    );

    const refreshToken = this.jwtService.sign(
      { userId: user.id, username: user.username },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION'),
      },
    );

    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const accessToken = this.jwtService.sign(
        { userId: payload.userId },
        {
          secret: this.configService.get('JWT_ACCESS_SECRET'),
          expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION'),
        },
      );

      return accessToken;
    } catch (error) {
      throw new HttpException('Invalid refresh token', HttpStatus.UNAUTHORIZED);
    }
  }

  async getUser(id: number) {
    try {
      const user = this.userService.findById(id);

      return user;
    } catch (error) {
      throw new HttpException('Cannot find user', HttpStatus.NOT_FOUND);
    }
  }

  async updateEmail(userId: number, email: string): Promise<void> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new HttpException('Email already in use', HttpStatus.BAD_REQUEST);
    }

    // Update the email in the database
    await this.prisma.user.update({
      where: { id: userId },
      data: { email },
    });
  }
}
