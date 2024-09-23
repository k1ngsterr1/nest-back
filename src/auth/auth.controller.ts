import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaService } from 'src/prisma.service';
import { UpdateEmailDto } from 'src/user/dto/update-email-dto';
import { UpdateUsernameDto } from 'src/user/dto/update-username-dto';
import { UserService } from 'src/user/user.service';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Res() res: Response) {
    try {
      await this.authService.register(registerDto);
      return res.status(HttpStatus.CREATED).json({
        message: 'User registered successfully',
      });
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res() res: Response) {
    try {
      const { accessToken, refreshToken } =
        await this.authService.login(loginDto);
      return res.status(HttpStatus.OK).json({ accessToken, refreshToken });
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
    }
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res() res: Response) {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) {
        throw new HttpException(
          'Refresh token is required',
          HttpStatus.BAD_REQUEST,
        );
      }
      const accessToken = await this.authService.refresh(refreshToken);
      return res.status(HttpStatus.OK).json({ accessToken });
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
    }
  }

  @Get('get-user')
  async getUser(@Req() req, @Res() res) {
    try {
      const userId = req.user.sub;
      const user = await this.authService.getUser(userId);

      if (!userId) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }

      return res.status(HttpStatus.OK).json({ user });
    } catch (err) {
      console.error('Error fetching user:', err.message);
      throw new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(AuthGuard)
  @Patch('update-email')
  async updateEmail(@Req() req, @Body() updateEmailDto: UpdateEmailDto) {
    const userId = req.sub.id; // Assuming user ID is added to the request by the Auth Guard

    if (!userId) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    try {
      await this.userService.updateEmail(userId, updateEmailDto.email);
      return { message: 'Email updated successfully' };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @UseGuards(AuthGuard)
  @Patch('update-username')
  async updateUsername(
    @Req() req,
    @Body() updateUsernameDto: UpdateUsernameDto,
  ) {
    const userId = req.sub.id; // Assuming the userId is added to the request by the Auth Guard

    if (!userId) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    try {
      // Call the service to update the username
      await this.userService.updateUsername(userId, updateUsernameDto.username);
      return { message: 'Username updated successfully' };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Patch('change-password')
  async changePassword(
    @Req() req,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    const { currentPassword, newPassword } = body;
    const userId = req.sub.id;

    if (!userId) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    await this.userService.changePassword(userId, currentPassword, newPassword);

    return { message: 'Password changed successfully' };
  }
}
