import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { TurnResult } from '../game-turn.entity';

export class SubmitAnswerDto {
  @ApiProperty({ enum: TurnResult, description: 'correct | wrong | skip' })
  @IsEnum(TurnResult)
  result: TurnResult;

  @ApiPropertyOptional({
    description: 'Chosen option index for multiple_choice cards (0-based)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  chosenIndex?: number;
}
