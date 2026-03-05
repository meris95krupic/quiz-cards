import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Game } from './game.entity';
import { GameTurn } from './game-turn.entity';

@Entity('game_players')
export class GamePlayer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'game_id' })
  gameId: string;

  @ManyToOne(() => Game, (g) => g.players, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'game_id' })
  game: Game;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, (u) => u.gamePlayers, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'avatar_id', type: 'smallint' })
  avatarId: number;

  @Column({ type: 'int', default: 0 })
  score: number;

  @Column({ name: 'turn_order', type: 'int' })
  turnOrder: number;

  @OneToMany(() => GameTurn, (gt) => gt.gamePlayer)
  turns: GameTurn[];
}
