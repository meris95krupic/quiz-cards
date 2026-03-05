import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CardList } from '../card-lists/card-list.entity';

export enum CardType {
  QA = 'qa',
  MULTIPLE_CHOICE = 'multiple_choice',
}

@Entity('cards')
export class Card {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'card_list_id' })
  cardListId: string;

  @ManyToOne(() => CardList, (cl) => cl.cards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'card_list_id' })
  cardList: CardList;

  @Column({ type: 'enum', enum: CardType })
  type: CardType;

  @Column({ type: 'text' })
  front: string;

  @Column({ type: 'text' })
  back: string;

  @Column({ type: 'jsonb', nullable: true })
  options: string[] | null;

  @Column({ name: 'correct_index', type: 'int', nullable: true })
  correctIndex: number | null;

  @Column({ type: 'int' })
  position: number;

  @Column({ name: 'bg_color', type: 'varchar', length: 20, nullable: true })
  bgColor: string | null;
}
