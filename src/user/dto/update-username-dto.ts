// src/user/dto/update-username.dto.ts
import { IsNotEmpty, MinLength } from 'class-validator';

export class UpdateUsernameDto {
  @IsNotEmpty({ message: 'New username is required' })
  @MinLength(4, { message: 'Username must be at least 4 characters long' })
  username: string;
}
