/**
 * CARD ENTITY — Die Karten-Tabelle
 *
 * Eine Card gehört zu einer CardList und repräsentiert eine einzelne Lernkarte.
 * Es gibt zwei Kartentypen:
 *   - QA: Frage/Antwort (front = Frage, back = Antwort)
 *   - MULTIPLE_CHOICE: Multiple Choice (front = Frage, options = Antwortmöglichkeiten)
 *
 * Tabelle in der DB: "cards"
 *
 * Beziehung: Viele Cards gehören zu EINER CardList (@ManyToOne)
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CardList } from '../card-lists/card-list.entity';

/**
 * TypeScript Enum für den Kartentyp.
 * Wird unten bei @Column({ type: 'enum', enum: CardType }) verwendet.
 *
 * PostgreSQL erstellt dafür einen eigenen ENUM-Typ in der Datenbank,
 * der nur die definierten Werte erlaubt ('qa' oder 'multiple_choice').
 * Jeder andere Wert wird von der DB abgelehnt → eingebaute Validierung!
 */
export enum CardType {
  QA = 'qa',
  MULTIPLE_CHOICE = 'multiple_choice',
}

@Entity('cards')
export class Card {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * @Column({ name: 'card_list_id' })
   * -----------------------------------
   * Die rohe Fremdschlüssel-Spalte (Foreign Key) zur CardList.
   *
   * WARUM gibt es SOWOHL cardListId ALS AUCH die cardList-Relation?
   * ---------------------------------------------------------------
   * Das ist ein häufiges Pattern in TypeORM:
   *   1. cardListId (string)     → die rohe UUID, immer verfügbar, kein JOIN nötig
   *   2. cardList (CardList)     → das volle Objekt, nur nach einem JOIN verfügbar
   *
   * Vorteil: Man kann `card.cardListId` lesen, ohne die ganze CardList zu laden.
   * Wenn man das volle Objekt braucht, nutzt man `relations: ['cardList']` beim Query.
   */
  @Column({ name: 'card_list_id' })
  cardListId: string;

  /**
   * @ManyToOne(() => CardList, (cl) => cl.cards, { onDelete: 'CASCADE' })
   * @JoinColumn({ name: 'card_list_id' })
   * -----------------------------------------------------------------------
   * RELATION: Viele Cards gehören zu EINER CardList (Many-to-One / N:1).
   *
   * @ManyToOne erklärt:
   * --------------------
   * - Dies ist die "Viele"-Seite der Beziehung.
   * - () => CardList — die Ziel-Entity
   * - (cl) => cl.cards — die inverse Seite (das OneToMany-Array in CardList)
   *
   * @JoinColumn erklärt:
   * ---------------------
   * - Sagt TypeORM, WELCHE Spalte in DIESER Tabelle den Fremdschlüssel enthält.
   * - { name: 'card_list_id' } → die Spalte "card_list_id" in der cards-Tabelle
   *   zeigt auf die id-Spalte der card_lists-Tabelle.
   * - Bei @ManyToOne ist @JoinColumn optional — TypeORM generiert den FK automatisch.
   *   Aber wenn man einen eigenen Spaltennamen will (snake_case!), muss man es angeben.
   *
   * onDelete: 'CASCADE' erklärt:
   * ----------------------------
   * Dies ist ein DATENBANK-Feature (Foreign Key Constraint).
   * Es bestimmt, was passiert, wenn die REFERENZIERTE Zeile gelöscht wird:
   *
   *   CASCADE   → Wenn die CardList gelöscht wird, werden ALLE zugehörigen Cards
   *               automatisch von der DATENBANK mitgelöscht. Sehr praktisch!
   *   SET NULL  → Der Fremdschlüssel wird auf NULL gesetzt (Spalte muss nullable sein)
   *   RESTRICT  → Das Löschen wird BLOCKIERT, solange noch Cards existieren
   *   NO ACTION → Ähnlich wie RESTRICT (Standard in PostgreSQL)
   *
   * Hier CASCADE, weil: Wenn eine Kartenliste gelöscht wird, sollen auch alle
   * Karten darin verschwinden. Das macht fachlich Sinn.
   */
  @ManyToOne(() => CardList, (cl) => cl.cards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'card_list_id' })
  cardList: CardList;

  /**
   * @Column({ type: 'enum', enum: CardType })
   * -------------------------------------------
   * Erstellt eine ENUM-Spalte in PostgreSQL.
   * Die erlaubten Werte kommen aus dem TypeScript-Enum oben: 'qa' oder 'multiple_choice'.
   *
   * In der DB sieht das so aus:
   *   ALTER TYPE card_type_enum AS ENUM ('qa', 'multiple_choice');
   *   type card_type_enum NOT NULL
   */
  @Column({ type: 'enum', enum: CardType })
  type: CardType;

  /**
   * Die Vorderseite der Karte (die Frage).
   * "type: 'text'" → unbegrenzte Textlänge in PostgreSQL.
   */
  @Column({ type: 'text' })
  front: string;

  /**
   * Die Rückseite der Karte (die Antwort bei QA-Karten).
   */
  @Column({ type: 'text' })
  back: string;

  /**
   * @Column({ type: 'jsonb', nullable: true })
   * --------------------------------------------
   * JSONB — ein PostgreSQL-spezifischer Datentyp!
   *
   * Was ist JSONB?
   * ---------------
   * JSONB speichert strukturierte JSON-Daten direkt in einer Spalte.
   * Anders als VARCHAR speichert JSONB die Daten in einem binären Format,
   * das effizient durchsucht und indiziert werden kann.
   *
   * Hier: Ein Array von Antwortmöglichkeiten für Multiple-Choice-Karten.
   * Beispiel: ["Berlin", "Hamburg", "München", "Köln"]
   *
   * Für QA-Karten ist dieses Feld NULL (nullable: true), weil es dort
   * keine Antwortoptionen gibt.
   *
   * TypeORM serialisiert/deserialisiert automatisch zwischen JS-Arrays und JSONB.
   */
  @Column({ type: 'jsonb', nullable: true })
  options: string[] | null;

  /**
   * Der Index der richtigen Antwort im options-Array (0-basiert).
   * Beispiel: Wenn options = ["Berlin", "Hamburg", "München"] und correctIndex = 0,
   * dann ist "Berlin" die richtige Antwort.
   * NULL bei QA-Karten (kein Multiple Choice).
   */
  @Column({ name: 'correct_index', type: 'int', nullable: true })
  correctIndex: number | null;

  /**
   * Die Position/Reihenfolge der Karte innerhalb der Liste.
   * Damit kann man die Karten sortiert anzeigen (ORDER BY position).
   */
  @Column({ type: 'int' })
  position: number;

  /**
   * Optionale Hintergrundfarbe für diese einzelne Karte.
   */
  @Column({ name: 'bg_color', type: 'varchar', length: 20, nullable: true })
  bgColor: string | null;
}
