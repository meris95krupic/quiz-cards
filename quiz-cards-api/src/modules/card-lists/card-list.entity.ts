/**
 * CARD LIST ENTITY — Die Kartenlisten-Tabelle
 *
 * Eine CardList ist eine Sammlung von Lernkarten, die einem User gehört.
 * Beispiel: "Spanisch Vokabeln" oder "JavaScript Grundlagen".
 *
 * Tabelle in der DB: "card_lists"
 *
 * Beziehungen:
 *   - Eine CardList gehört zu einem User (über userId) — aber KEIN @ManyToOne hier
 *     definiert, nur die rohe userId-Spalte. Das ist eine bewusste Design-Entscheidung:
 *     Man braucht nicht immer eine volle Relation, wenn man nur die ID speichern will.
 *   - Eine CardList hat VIELE Cards (1:N Beziehung mit Cascade)
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Card } from '../cards/card.entity';

@Entity('card_lists')
export class CardList {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * @Column({ name: 'user_id', type: 'uuid', nullable: true })
   * -------------------------------------------------------------
   * Die User-ID des Besitzers dieser Kartenliste.
   *
   * "nullable: true" bedeutet: Diese Spalte darf NULL sein.
   * In SQL wird das zu: user_id UUID NULL
   * Ohne "nullable" wäre die Spalte NOT NULL (Standardverhalten in TypeORM).
   *
   * In TypeScript spiegeln wir das mit "string | null" wider.
   * NULL könnte z.B. für Listen stehen, die keinem User gehören (z.B. Shop-Vorlagen).
   *
   * "type: 'uuid'" sagt TypeORM explizit den PostgreSQL-Datentyp.
   * PostgreSQL hat einen nativen UUID-Typ, der effizienter ist als VARCHAR(36).
   *
   * HINWEIS: Hier gibt es absichtlich KEINE @ManyToOne-Relation zum User.
   * Man KANN Fremdschlüssel auch ohne Relation speichern — man verliert dann nur
   * die Möglichkeit, den User automatisch per JOIN mitzuladen.
   */
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  /**
   * @Column({ length: 255 })
   * -------------------------
   * Der Titel der Kartenliste. VARCHAR(255) — max. 255 Zeichen.
   */
  @Column({ length: 255 })
  title: string;

  /**
   * @Column({ type: 'text', nullable: true })
   * -------------------------------------------
   * "type: 'text'" erzeugt eine TEXT-Spalte statt VARCHAR.
   * TEXT hat keine Längenbegrenzung (praktisch unbegrenzt in PostgreSQL).
   * Gut geeignet für längere Beschreibungen, bei denen man die maximale Länge nicht kennt.
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Hintergrundfarbe der Liste (z.B. "#FF5733"), optional.
   */
  @Column({ name: 'bg_color', type: 'varchar', length: 20, nullable: true })
  bgColor: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * @OneToMany(() => Card, (card) => card.cardList, { cascade: true })
   * -------------------------------------------------------------------
   * RELATION: Eine CardList hat VIELE Cards (1:N).
   *
   * NEU HIER: { cascade: true }
   * ---------------------------
   * "cascade" ist ein sehr mächtiges Feature! Es bedeutet:
   *
   * Wenn du eine CardList speicherst und das cards-Array befüllt ist,
   * werden die Cards AUTOMATISCH MIT gespeichert/aktualisiert/gelöscht.
   *
   * Beispiel OHNE Cascade:
   *   const list = new CardList();
   *   list.cards = [new Card(), new Card()];
   *   await repo.save(list);
   *   // ❌ Nur die Liste wird gespeichert, die Cards werden IGNORIERT!
   *
   * Beispiel MIT Cascade:
   *   const list = new CardList();
   *   list.cards = [new Card(), new Card()];
   *   await repo.save(list);
   *   // ✅ Liste UND alle Cards werden gespeichert!
   *
   * Cascade-Optionen (man kann auch einzeln angeben):
   *   cascade: true           → alles: insert, update, remove
   *   cascade: ['insert']     → nur beim Erstellen
   *   cascade: ['update']     → nur beim Aktualisieren
   *   cascade: ['remove']     → nur beim Löschen
   *
   * ACHTUNG: Cascade ≠ onDelete!
   *   - cascade ist ein TypeORM-Feature (auf Anwendungsebene)
   *   - onDelete ist ein DB-Feature (auf Datenbankebene, via Foreign Key Constraint)
   */
  @OneToMany(() => Card, (card) => card.cardList, { cascade: true })
  cards: Card[];
}
