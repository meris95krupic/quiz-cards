import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { Game } from './game.entity';
import { GamePlayer } from './game-player.entity';
import { GameTurn } from './game-turn.entity';
import { CardList } from '../card-lists/card-list.entity';
import { Card } from '../cards/card.entity';
import { CardProgress } from '../cards/card-progress.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Game, GamePlayer, GameTurn, CardList, Card, CardProgress]),
  ],
  providers: [GamesService],
  controllers: [GamesController],
})
export class GamesModule {}
