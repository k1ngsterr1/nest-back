import { IsNotEmpty } from 'class-validator';

export class UpdateRefCodeDto {
  @IsNotEmpty({ message: 'New referral code is required' })
  newRefCode: string;
}
