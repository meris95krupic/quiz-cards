import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CardListsService } from './card-lists.service';
import { ImportCardListDto } from './dto/import-card-list.dto';

@ApiTags('card-lists')
@Controller('card-lists')
export class CardListsController {
  constructor(private readonly cardListsService: CardListsService) {}

  @Get()
  @ApiOperation({ summary: 'List all card lists' })
  findAll() {
    return this.cardListsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get card list with all cards' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.cardListsService.findOne(id);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import a card list from JSON' })
  import(@Body() dto: ImportCardListDto) {
    return this.cardListsService.import(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a card list and all its cards' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.cardListsService.remove(id);
  }
}
