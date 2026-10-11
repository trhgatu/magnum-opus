import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  MaxLength,
} from 'class-validator';

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
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timeZone?: string;
}
