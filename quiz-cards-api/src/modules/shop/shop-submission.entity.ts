import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { CardList } from '../card-lists/card-list.entity';

export type ShopStatus = 'pending' | 'approved' | 'rejected';

@Entity('shop_submissions')
export class ShopSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'card_list_id' })
  cardListId: string;

  @ManyToOne(() => CardList, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'card_list_id' })
  cardList: CardList;

  @Column({ name: 'submitted_by' })
  submittedBy: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submitted_by' })
  submitter: User;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: ShopStatus;

  @CreateDateColumn({ name: 'submitted_at' })
  submittedAt: Date;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;
}
