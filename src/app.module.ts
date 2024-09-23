import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PaymentModule } from './payment/payment.module';
import { LolaModule } from './lola/lola.module';

@Module({
  imports: [ConfigModule.forRoot(), AuthModule, PaymentModule, LolaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
