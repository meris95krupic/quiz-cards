import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateGameDto {
  @ApiProperty({ description: 'ID of the card list to play with' })
  @IsUUID()
  cardListId: string;
}
