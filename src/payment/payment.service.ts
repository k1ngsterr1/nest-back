import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';
import { PrismaService } from 'src/prisma.service';
import { UserService } from 'src/user/user.service';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  async checkoutCryptomus(amount: number, currency: string, username: string) {
    try {
      const CRYPTOMUS_API_KEY = process.env.CRYPTOMUS_API_KEY;
      const CRYPTOMUS_MERCHANT_ID = process.env.CRYPTOMUS_MERCHANT_ID;
      const CRYPTOMUS_CALLBACK_ROUTE = process.env.CRYPTOMUS_CALLBACK_ROUTE;
      const CRYPTOMUS_RETURN_ROUTE = process.env.CRYPTOMUS_RETURN_ROUTE;

      const data = {
        amount,
        currency,
        order_id: crypto.randomBytes(12).toString('hex'),
        url_callback: CRYPTOMUS_CALLBACK_ROUTE,
        url_return: CRYPTOMUS_RETURN_ROUTE,
      };

      const sign = crypto
        .createHash('md5')
        .update(
          Buffer.from(JSON.stringify(data)).toString('base64') +
            CRYPTOMUS_API_KEY,
        )
        .digest('hex');

      const response = await axios.post(
        'https://api.cryptomus.com/v1/payment',
        data,
        {
          headers: {
            merchant: CRYPTOMUS_MERCHANT_ID,
            sign,
          },
        },
      );

      const {
        order_id,
        amount: cryptomusAmount,
        status,
      } = response.data.result;

      await this.prisma.payment.create({
        data: {
          payment_id: order_id,
          status,
          amount: cryptomusAmount,
          username,
          payment_type: 'cryptomus',
        },
      });

      return response.data;
    } catch (err) {
      console.error('Error in checkoutCryptomus:', err.message);
      throw new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async findPaymentByOrderId(orderId: string) {
    return this.prisma.payment.findUnique({
      where: { payment_id: orderId },
    });
  }

  async updatePayment(orderId: string, data: any) {
    return this.prisma.payment.update({
      where: { payment_id: orderId },
      data,
    });
  }
}
