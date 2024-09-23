import {
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { LolaService } from './lola.service';

@Controller('v1/proxy')
export class LolaController {
  constructor(private readonly lolaService: LolaService) {}

  @UseGuards(AuthGuard)
  @Post('/activate-proxy')
  async activateProxy(
    @Req() req,
    @Body('provider') provider: string, // Accept provider (e.g., 'lola')
    @Body('service_type') serviceType: string, // Accept service type (e.g., 'residential')
    @Body('region') region: { country: string; state: string; city: string }, // Optional region
  ): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      throw new UnauthorizedException();
    }

    // Call the service method with the selected provider and service type
    const response = await this.lolaService.activateProxy(
      userId,
      provider,
      serviceType,
    );

    return response;
  }
}
