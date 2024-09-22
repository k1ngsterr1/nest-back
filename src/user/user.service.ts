import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as bcryptjs from 'bcryptjs';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  async findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByUsernameOrEmail(usernameOrEmail: string) {
    return this.prisma.user.findFirst({
      where: {
        OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
      },
    });
  }

  // Create a new user
  async createUser(user: {
    username: string;
    email: string;
    password: string;
    refCode: string;
    invitedBy: string | null;
  }) {
    const hashedPassword = await bcryptjs.hash(user.password, 10);

    return this.prisma.user.create({
      data: {
        username: user.username,
        email: user.email,
        password: hashedPassword,
        refCode: user.refCode,
        invitedBy: user.invitedBy,
      },
    });
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

  // Update user's username
  async updateUsername(userId: number, username: string): Promise<void> {
    // Check if the username is already in use
    const existingUser = await this.prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      throw new HttpException(
        'Username already in use',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Update the user's username in the database
    await this.prisma.user.update({
      where: { id: userId },
      data: { username },
    });
  }

  // Update referral code
  async updateRefCode(userId: number, newRefCode: string): Promise<void> {
    const existingCode = await this.prisma.user.findFirst({
      where: { refCode: newRefCode },
    });

    if (existingCode) {
      throw new HttpException(
        'Referral code already in use',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Update the referral code
    await this.prisma.user.update({
      where: { id: userId },
      data: { refCode: newRefCode },
    });
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    if (!currentPassword || !newPassword) {
      throw new HttpException(
        'Both current and new passwords are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (newPassword.length < 8) {
      throw new HttpException(
        'New password must be at least 8 characters long',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const isPasswordValid = await bcryptjs.compare(
        currentPassword,
        user.password,
      );
      if (!isPasswordValid) {
        throw new HttpException(
          'Current password is incorrect',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const isNewPasswordSame = await bcryptjs.compare(
        newPassword,
        user.password,
      );
      if (isNewPasswordSame) {
        throw new HttpException(
          'New password cannot be the same as the current password',
          HttpStatus.BAD_REQUEST,
        );
      }

      const hashedNewPassword = await bcryptjs.hash(newPassword, 10);

      await this.prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword },
      });
    } catch (error) {
      console.error('Error changing password:', error.message);
      throw new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updateUserBalance(username: string, amount: number) {
    return this.prisma.user.update({
      where: { username },
      data: {
        balance: {
          increment: amount,
        },
      },
    });
  }
}
