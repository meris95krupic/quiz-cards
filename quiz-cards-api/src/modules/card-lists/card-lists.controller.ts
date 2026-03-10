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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from '../users/user.entity';
import { CardListsService } from './card-lists.service';
import { ImportCardListDto } from './dto/import-card-list.dto';

@ApiTags('card-lists')
@Controller('card-lists')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CardListsController {
  constructor(private readonly cardListsService: CardListsService) {}

  @Get()
  @ApiOperation({ summary: 'List my card lists' })
  findAll(@CurrentUser() user: User) {
    return this.cardListsService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get card list with all cards' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.cardListsService.findOne(id);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import a card list from JSON' })
  import(@Body() dto: ImportCardListDto, @CurrentUser() user: User) {
    return this.cardListsService.import(dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a card list and all its cards' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.cardListsService.remove(id);
  }
}
