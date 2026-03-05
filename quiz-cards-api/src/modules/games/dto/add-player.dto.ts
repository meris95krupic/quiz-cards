import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';

export class AddPlayerDto {
  @ApiPropertyOptional({
    description: 'Registered user ID (Modus B). Leave empty for quick play.',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ description: 'Display name (required for quick play)' })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiProperty({ minimum: 1, maximum: 10 })
  @IsInt()
  @Min(1)
  @Max(10)
  avatarId: number;
}
