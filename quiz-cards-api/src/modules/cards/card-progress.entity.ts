/**
 * CARD PROGRESS ENTITY — Lernfortschritt pro User pro Karte
 *
 * Speichert, wie gut ein bestimmter User eine bestimmte Karte beherrscht.
 * Level 1 = neu/unbekannt, Level 10 = gemeistert.
 * Bei richtiger Antwort: Level +1, bei falscher: Level -1 (geclamped auf [1, 10]).
 *
 * Tabelle in der DB: "card_progress"
 *
 * Beziehungen:
 *   - Viele CardProgress-Einträge gehören zu EINEM User (N:1)
 *   - Viele CardProgress-Einträge gehören zu EINER Card (N:1)
 *   - UNIQUE Constraint: Pro User und Card nur EIN Eintrag erlaubt
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Card } from './card.entity';

/** Konstanten für den erlaubten Level-Bereich */
export const MIN_LEVEL = 1;
export const MAX_LEVEL = 10;

/**
 * @Unique(['userId', 'cardId'])
 * ------------------------------
 * Erstellt einen ZUSAMMENGESETZTEN UNIQUE-Constraint über die Spalten userId UND cardId.
 *
 * Das heißt: Die KOMBINATION aus userId und cardId muss eindeutig sein.
 * Ein User kann für jede Karte nur EINEN Fortschritt haben.
 * Aber verschiedene User können Fortschritt für die GLEICHE Karte haben.
 *
 * In SQL: UNIQUE(user_id, card_id)
 *
 * ACHTUNG: Die Werte im Array sind die PROPERTY-Namen (TypeScript),
 * nicht die Spaltennamen in der DB! Also 'userId' statt 'user_id'.
 */
@Entity('card_progress')
@Unique(['userId', 'cardId'])
export class CardProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Rohe Fremdschlüssel-Spalte zum User.
   * Wird zusammen mit der @ManyToOne-Relation unten verwendet.
   */
  @Column({ name: 'user_id' })
  userId: string;

  /**
   * Rohe Fremdschlüssel-Spalte zur Card.
   */
  @Column({ name: 'card_id' })
  cardId: string;

  /**
   * Lernlevel: 1 (neu) bis 10 (gemeistert).
   * "default: 1" → neue Karten starten bei Level 1.
   */
  @Column({ type: 'int', default: 1 })
  level: number;

  /**
   * @UpdateDateColumn({ name: 'updated_at' })
   * -------------------------------------------
   * Ähnlich wie @CreateDateColumn, aber wird bei JEDEM UPDATE automatisch aktualisiert.
   *
   * Jedes Mal, wenn TypeORM ein UPDATE auf diese Zeile ausführt (z.B. Level-Änderung),
   * wird updated_at automatisch auf den aktuellen Zeitstempel gesetzt.
   *
   * Nützlich, um zu sehen, wann der Fortschritt zuletzt geändert wurde.
   */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * @ManyToOne(() => User, { onDelete: 'CASCADE' })
   * @JoinColumn({ name: 'user_id' })
   * -------------------------------------------------
   * Relation zum User: Viele CardProgress gehören zu EINEM User.
   *
   * BEACHTE: Hier gibt es KEINE inverse Seite angegeben!
   * Bei @ManyToOne kann man die inverse Callback-Funktion weglassen,
   * wenn man auf der User-Seite KEIN @OneToMany-Array für CardProgress hat.
   *
   * Das ist völlig in Ordnung — nicht jede Relation braucht beide Seiten.
   * Man definiert die inverse Seite nur, wenn man sie tatsächlich braucht
   * (z.B. um von User aus alle CardProgress-Einträge zu laden).
   */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /**
   * Relation zur Card: Viele CardProgress gehören zu EINER Card.
   * onDelete: 'CASCADE' → Wenn die Karte gelöscht wird, wird auch der Fortschritt gelöscht.
   */
  @ManyToOne(() => Card, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'card_id' })
  card: Card;
}
