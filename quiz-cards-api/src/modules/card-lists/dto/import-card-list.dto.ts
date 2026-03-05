import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsHexColor,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CardType } from '../../cards/card.entity';

export class ImportCardDto {
  @ApiProperty({ enum: CardType })
  @IsEnum(CardType)
  type: CardType;

  @ApiProperty()
  @IsString()
  @Length(1, 2000)
  front: string;

  @ApiProperty()
  @IsString()
  @Length(1, 2000)
  back: string;

  @ApiPropertyOptional({ type: [String], maxItems: 4 })
  @ValidateIf((o: ImportCardDto) => o.type === CardType.MULTIPLE_CHOICE)
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional({ minimum: 0, maximum: 3 })
  @ValidateIf((o: ImportCardDto) => o.type === CardType.MULTIPLE_CHOICE)
  @IsInt()
  @Min(0)
  @Max(3)
  correctIndex?: number;

  @ApiPropertyOptional({ example: '#FF6584' })
  @IsOptional()
  @IsHexColor()
  bgColor?: string;
}

export class ImportCardListDto {
  @ApiProperty()
  @IsString()
  @Length(1, 255)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @ApiPropertyOptional({ example: '#6C63FF' })
  @IsOptional()
  @IsHexColor()
  bgColor?: string;

  @ApiProperty({ type: [ImportCardDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ImportCardDto)
  cards: ImportCardDto[];
}
