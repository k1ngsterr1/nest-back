import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma.service';
import { LolaController } from './lola.controller';
import { LolaService } from './lola.service';

@Module({
  imports: [HttpModule],
  controllers: [LolaController],
  providers: [LolaService, PrismaService, JwtService],
})
export class LolaModule {}
