import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { LolaService } from './lola.service';

@Controller('lola')
export class LolaController {
  constructor(private lolaService: LolaService) {}

  @UseGuards(AuthGuard)
  @Post('buy')
  async buyProxy(
    @Req() req,
    @Body('traffic') traffic: number,
    @Body('serviceType') serviceType: string,
  ): Promise<void> {
    const userId = req.user?.id;
    console.log(req.sub);
    if (!userId) {
      throw new UnauthorizedException();
    }

    const response = await this.lolaService.buyProxy(
      userId,
      traffic,
      serviceType,
    );

    return response;
  }

  @UseGuards(AuthGuard)
  @Get('/get-bandwidth/:planId')
  async readPlan(
    @Param('planId') planId: string, // Extract planId from the request URL
  ): Promise<any> {
    const response = await this.lolaService.getBandwidthAsync(planId);

    // Return the response to the client
    return response;
  }
}
