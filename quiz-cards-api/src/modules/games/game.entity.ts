import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { CardList } from '../card-lists/card-list.entity';
import { GamePlayer } from './game-player.entity';
import { GameTurn } from './game-turn.entity';

export enum GameStatus {
  LOBBY = 'lobby',
  IN_PROGRESS = 'in_progress',
  FINISHED = 'finished',
}

@Entity('games')
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'card_list_id', type: 'uuid', nullable: true })
  cardListId: string | null;

  @ManyToOne(() => CardList, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'card_list_id' })
  cardList: CardList;

  @Column({ type: 'enum', enum: GameStatus, default: GameStatus.LOBBY })
  status: GameStatus;

  @Column({ name: 'current_card_index', type: 'int', default: 0 })
  currentCardIndex: number;

  /** Ordered card IDs set at game start (null → use seeded shuffle fallback) */
  @Column({ name: 'card_order', type: 'jsonb', nullable: true })
  cardOrder: string[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt: Date | null;

  @OneToMany(() => GamePlayer, (gp) => gp.game, { cascade: true })
  players: GamePlayer[];

  @OneToMany(() => GameTurn, (gt) => gt.game, { cascade: true })
  turns: GameTurn[];
}
