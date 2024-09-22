import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { UserService } from 'src/user/user.service';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {}

  @Post('checkout-cryptomus')
  async checkoutCryptomus(
    @Req() req,
    @Body() body: { amount: number; currency: string },
  ) {
    const { amount, currency } = body;
    const username = req.sub?.username; // Assuming user is attached to the request via middleware

    if (!username) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    return await this.paymentService.checkoutCryptomus(
      amount,
      currency,
      username,
    );
  }

  @Post('cryptomus-callback')
  async cryptomusCallback(@Req() req, @Body() body: any) {
    const { sign } = body;

    if (!sign) {
      throw new HttpException(
        'Invalid payload: Missing sign',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const rawData = req.rawBody;

      // Parse the raw body and remove the sign
      const data = JSON.parse(rawData);
      delete data.sign;

      // Generate hash to verify the signature
      const hash = crypto
        .createHash('md5')
        .update(
          Buffer.from(JSON.stringify(data)).toString('base64') +
            this.configService.get('CRYPTOMUS_API_KEY'),
        )
        .digest('hex');

      if (hash !== sign) {
        throw new HttpException('Invalid sign', HttpStatus.BAD_REQUEST);
      }

      const { order_id, amount, status, network, payment_currency } = data;

      // Find the payment using Prisma
      const payment = await this.paymentService.findPaymentByOrderId(order_id);

      if (!payment) {
        throw new HttpException('Payment not found', HttpStatus.NOT_FOUND);
      }

      const username = payment.username;

      // Update payment details
      await this.paymentService.updatePayment(order_id, {
        status,
        amount,
        network,
        payer_currency: payment_currency,
      });

      // If payment is successful, update the user's balance
      if (status === 'paid' || status === 'paid_over') {
        await this.userService.updateUserBalance(username, amount);
      }

      return { message: 'Callback processed successfully' };
    } catch (err) {
      console.error('Error in cryptomus callback:', err.message);
      throw new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
