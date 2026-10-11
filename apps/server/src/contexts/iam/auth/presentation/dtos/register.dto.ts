import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'testuser@gmail.com',
    description: 'The email address of the user',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  email!: string;

  @ApiProperty({ example: 'testuser', description: 'The username of the user' })
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  username!: string;

  @ApiProperty({
    example: 'SecurePassword123!',
    description: 'The password of the user',
  })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password!: string;
  @ApiProperty({
    example: 'Asia/Ho_Chi_Minh',
    description: 'Browser time zone; falls back to UTC when missing or unknown',
    required: false,
  })
  // Không giới hạn độ dài ở đây: giá trị lạ (kể cả quá dài) phải tới được
  // RegisterHandler để lùi về UTC, không được chặn cả việc đăng ký.
  @IsOptional()
  @IsString()
  timeZone?: string;
}
