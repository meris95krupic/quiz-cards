/**
 * GAME ENTITY — Die Spiel-Tabelle
 *
 * Repräsentiert ein Quiz-Spiel (lokal oder online).
 * Ein Spiel durchläuft drei Status-Phasen:
 *   LOBBY → IN_PROGRESS → FINISHED
 *
 * Tabelle in der DB: "games"
 *
 * Beziehungen:
 *   - Ein Game nutzt EINE CardList (N:1 — viele Games können die gleiche Liste nutzen)
 *   - Ein Game hat VIELE GamePlayers (1:N mit Cascade)
 *   - Ein Game hat VIELE GameTurns (1:N mit Cascade)
 */
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

/**
 * Enum für den Spielstatus.
 * In PostgreSQL wird ein eigener ENUM-Typ erstellt, der nur diese 3 Werte erlaubt.
 */
export enum GameStatus {
  /** Spieler können beitreten, Spiel hat noch nicht begonnen */
  LOBBY = 'lobby',
  /** Spiel läuft, Karten werden gespielt */
  IN_PROGRESS = 'in_progress',
  /** Spiel ist beendet, Ergebnisse sind verfügbar */
  FINISHED = 'finished',
}

@Entity('games')
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Rohe FK-Spalte zur CardList. nullable: true, weil die Liste nachträglich gelöscht werden könnte.
   */
  @Column({ name: 'card_list_id', type: 'uuid', nullable: true })
  cardListId: string | null;

  /**
   * @ManyToOne(() => CardList, { nullable: true, onDelete: 'SET NULL' })
   * @JoinColumn({ name: 'card_list_id' })
   * ---------------------------------------------------------------------
   * Relation zur CardList: Viele Games können die gleiche CardList nutzen.
   *
   * nullable: true — ein Spiel KANN ohne Kartenliste existieren.
   *
   * onDelete: 'SET NULL' — ANDERS als CASCADE!
   * Wenn die CardList gelöscht wird:
   *   CASCADE   → Das Game wird AUCH gelöscht (nicht gewollt!)
   *   SET NULL  → card_list_id wird auf NULL gesetzt, das Game bleibt bestehen ✅
   *
   * SET NULL ist hier die richtige Wahl, weil abgeschlossene Spiele (mit Ergebnissen)
   * auch nach dem Löschen der Kartenliste noch sichtbar sein sollen.
   */
  @ManyToOne(() => CardList, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'card_list_id' })
  cardList: CardList;

  /**
   * @Column({ type: 'enum', enum: GameStatus, default: GameStatus.LOBBY })
   * -----------------------------------------------------------------------
   * ENUM-Spalte mit Default-Wert.
   * Neue Spiele starten immer im LOBBY-Status.
   * "default: GameStatus.LOBBY" → in SQL: DEFAULT 'lobby'
   */
  @Column({ type: 'enum', enum: GameStatus, default: GameStatus.LOBBY })
  status: GameStatus;

  /**
   * Index der aktuellen Karte im cardOrder-Array.
   * Startet bei 0 und wird nach jeder Runde erhöht.
   */
  @Column({ name: 'current_card_index', type: 'int', default: 0 })
  currentCardIndex: number;

  /**
   * @Column({ name: 'card_order', type: 'jsonb', nullable: true })
   * ----------------------------------------------------------------
   * JSONB-Spalte mit der Reihenfolge der Karten-IDs.
   *
   * Wird beim Spielstart festgelegt (gemischt/shuffled).
   * Beispiel: ["uuid-karte-3", "uuid-karte-1", "uuid-karte-2"]
   *
   * Warum als JSONB statt als separate Tabelle?
   * → Die Reihenfolge ist spielspezifisch und ändert sich nicht mehr nach dem Start.
   * → Ein Array in einer Spalte ist hier einfacher und performanter als eine N:M-Tabelle.
   * → JSONB ermöglicht auch Indexierung und Abfragen, falls nötig.
   */
  @Column({ name: 'card_order', type: 'jsonb', nullable: true })
  cardOrder: string[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
   * -----------------------------------------------------------------------
   * Zeitpunkt, wann das Spiel beendet wurde. NULL solange das Spiel läuft.
   *
   * "type: 'timestamptz'" = TIMESTAMP WITH TIME ZONE in PostgreSQL.
   * Das ist wichtig für internationale Anwendungen, weil der Zeitpunkt
   * dann immer in UTC gespeichert und beim Lesen in die lokale Zeitzone konvertiert wird.
   *
   * Unterschied zu @CreateDateColumn: Hier wird der Wert MANUELL gesetzt
   * (wenn das Spiel auf FINISHED wechselt), nicht automatisch.
   */
  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt: Date | null;

  /**
   * @OneToMany(() => GamePlayer, (gp) => gp.game, { cascade: true })
   * ------------------------------------------------------------------
   * 1:N Relation: Ein Game hat VIELE Spieler.
   *
   * { cascade: true } → Wenn man ein Game mit befülltem players-Array speichert,
   * werden die GamePlayer-Einträge automatisch mit erstellt/aktualisiert.
   *
   * Beispiel:
   *   const game = new Game();
   *   game.players = [new GamePlayer(), new GamePlayer()];
   *   await gameRepo.save(game);
   *   // → Game + beide GamePlayers werden in einem Rutsch gespeichert!
   */
  @OneToMany(() => GamePlayer, (gp) => gp.game, { cascade: true })
  players: GamePlayer[];

  /**
   * 1:N Relation: Ein Game hat VIELE Spielzüge (Turns).
   * Auch hier mit Cascade, damit Turns beim Speichern des Games mit erstellt werden.
   */
  @OneToMany(() => GameTurn, (gt) => gt.game, { cascade: true })
  turns: GameTurn[];
}
