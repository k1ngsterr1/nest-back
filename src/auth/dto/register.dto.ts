export class RegisterDto {
  username: string;
  email: string;
  password: string;
  refCode?: string;
}

export class LoginDto {
  username: string;
  password: string;
}
