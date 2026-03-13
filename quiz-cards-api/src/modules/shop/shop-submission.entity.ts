/**
 * SHOP SUBMISSION ENTITY — Die Shop-Einreichungen-Tabelle
 *
 * Wenn ein User seine Kartenliste im Shop veröffentlichen möchte,
 * erstellt er eine ShopSubmission. Ein Admin muss diese dann genehmigen oder ablehnen.
 *
 * Workflow: pending → approved/rejected
 *
 * Tabelle in der DB: "shop_submissions"
 *
 * Beziehungen:
 *   - Eine Submission referenziert EINE CardList (N:1, eager)
 *   - Eine Submission referenziert EINEN User als Einreicher (N:1, eager)
 */
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

/**
 * TypeScript Type-Alias für den Einreichungs-Status.
 *
 * BEACHTE: Hier wird ein Type-Alias statt eines Enums verwendet!
 * Das ist eine Alternative — statt einem PostgreSQL ENUM-Typ wird die
 * Spalte als VARCHAR(20) mit Default 'pending' gespeichert.
 *
 * Vorteil: Flexibler, weil man neue Werte hinzufügen kann, ohne den
 * ENUM-Typ in der DB zu ändern (ALTER TYPE ... ADD VALUE ist in PostgreSQL umständlich).
 * Nachteil: Keine DB-seitige Validierung — die DB akzeptiert auch ungültige Werte.
 */
export type ShopStatus = 'pending' | 'approved' | 'rejected';

@Entity('shop_submissions')
export class ShopSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Rohe FK-Spalte zur eingereichten CardList */
  @Column({ name: 'card_list_id' })
  cardListId: string;

  /**
   * @ManyToOne(() => CardList, { eager: true, onDelete: 'CASCADE' })
   * @JoinColumn({ name: 'card_list_id' })
   * -----------------------------------------------------------------
   * Relation zur eingereichten Kartenliste.
   *
   * NEU HIER: { eager: true }
   * --------------------------
   * "eager: true" ist ein wichtiges Lade-Konzept in TypeORM!
   *
   * OHNE eager (Standard):
   *   const submission = await repo.findOne({ where: { id } });
   *   console.log(submission.cardList); // undefined! Relation nicht geladen.
   *   // Man muss explizit laden:
   *   const submission = await repo.findOne({ where: { id }, relations: ['cardList'] });
   *
   * MIT eager: true:
   *   const submission = await repo.findOne({ where: { id } });
   *   console.log(submission.cardList); // ✅ CardList ist automatisch geladen!
   *
   * TypeORM fügt automatisch einen LEFT JOIN hinzu, wenn eager: true gesetzt ist.
   *
   * VORSICHT: Eager Loading kann zu Performance-Problemen führen, wenn die Relation
   * große Datenmengen enthält. Hier ist es OK, weil eine ShopSubmission IMMER
   * zusammen mit ihrer CardList angezeigt wird.
   *
   * Gegenkonzept: "lazy loading" → Relation wird erst geladen, wenn man darauf zugreift
   * (erfordert Promise-Typ: cardList: Promise<CardList>). Wird in der Praxis selten genutzt.
   *
   * onDelete: 'CASCADE' → Wenn die CardList gelöscht wird, wird auch die Submission gelöscht.
   * Das macht Sinn: Eine Einreichung ohne Kartenliste hat keinen Zweck.
   */
  @ManyToOne(() => CardList, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'card_list_id' })
  cardList: CardList;

  /** Rohe FK-Spalte: ID des Users, der die Liste eingereicht hat */
  @Column({ name: 'submitted_by' })
  submittedBy: string;

  /**
   * Relation zum einreichenden User (eager: true → automatisch mitgeladen).
   * Wird z.B. im Admin-Panel angezeigt: "Eingereicht von: Max Mustermann"
   */
  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submitted_by' })
  submitter: User;

  /**
   * @Column({ type: 'varchar', length: 20, default: 'pending' })
   * ---------------------------------------------------------------
   * Status der Einreichung als VARCHAR statt ENUM.
   *
   * Hier wird der TypeScript Type-Alias "ShopStatus" als Typ genutzt,
   * aber in der DB ist es einfach ein VARCHAR(20) mit Default 'pending'.
   *
   * TypeORM weiß nichts von dem Type-Alias — die Validierung muss im
   * Application-Code passieren (z.B. mit class-validator oder manuell).
   */
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: ShopStatus;

  /**
   * Zeitpunkt der Einreichung. Wird automatisch beim INSERT gesetzt.
   */
  @CreateDateColumn({ name: 'submitted_at' })
  submittedAt: Date;

  /**
   * Zeitpunkt der Review (Genehmigung/Ablehnung) durch den Admin.
   * NULL solange noch nicht reviewed.
   * "timestamptz" → TIMESTAMP WITH TIME ZONE (siehe Erklärung in game.entity.ts).
   */
  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;
}
