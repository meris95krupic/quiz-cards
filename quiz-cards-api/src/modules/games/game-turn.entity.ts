import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Game } from './game.entity';
import { GamePlayer } from './game-player.entity';
import { Card } from '../cards/card.entity';

export enum TurnResult {
  CORRECT = 'correct',
  WRONG = 'wrong',
  SKIP = 'skip',
}

@Entity('game_turns')
export class GameTurn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'game_id' })
  gameId: string;

  @ManyToOne(() => Game, (g) => g.turns, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'game_id' })
  game: Game;

  @Column({ name: 'game_player_id' })
  gamePlayerId: string;

  @ManyToOne(() => GamePlayer, (gp) => gp.turns, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'game_player_id' })
  gamePlayer: GamePlayer;

  @Column({ name: 'card_id' })
  cardId: string;

  @ManyToOne(() => Card, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'card_id' })
  card: Card;

  @Column({ type: 'enum', enum: TurnResult })
  result: TurnResult;

  @CreateDateColumn({ name: 'played_at' })
  playedAt: Date;
}
