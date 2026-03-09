import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GamesService } from './games.service';
import { CreateGameDto } from './dto/create-game.dto';
import { AddPlayerDto } from './dto/add-player.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import type { User } from '../users/user.entity';

@ApiTags('games')
@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new game in LOBBY status' })
  create(@Body() dto: CreateGameDto) {
    return this.gamesService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get game status and players' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.gamesService.findOne(id);
  }

  @Get(':id/state')
  @ApiOperation({ summary: 'Get full game state for polling (lobby/playing/finished)' })
  getState(@Param('id', ParseUUIDPipe) id: string) {
    return this.gamesService.getState(id);
  }

  @Post(':id/players')
  @ApiOperation({ summary: 'Add a player to the game lobby' })
  addPlayer(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddPlayerDto) {
    return this.gamesService.addPlayer(id, dto);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start the game (LOBBY → IN_PROGRESS)' })
  start(@Param('id', ParseUUIDPipe) id: string) {
    return this.gamesService.start(id);
  }

  @Get(':id/current-card')
  @ApiOperation({ summary: 'Get current card and whose turn it is' })
  getCurrentCard(@Param('id', ParseUUIDPipe) id: string) {
    return this.gamesService.getCurrentCard(id);
  }

  @Post(':id/answer')
  @ApiOperation({ summary: 'Submit answer for current card (correct/wrong/skip)' })
  submitAnswer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitAnswerDto,
  ) {
    return this.gamesService.submitAnswer(id, dto);
  }

  @Get(':id/results')
  @ApiOperation({ summary: 'Get final results and ranking' })
  getResults(@Param('id', ParseUUIDPipe) id: string) {
    return this.gamesService.getResults(id);
  }

  /**
   * GET /games/progress/:listId
   * Returns learning progress (card levels) for the authenticated user.
   */
  @Get('progress/:listId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get learning progress for a card list (auth required)' })
  getProgress(
    @Param('listId', ParseUUIDPipe) listId: string,
    @CurrentUser() user: User,
  ) {
    return this.gamesService.getListProgress(user.id, listId);
  }
}
