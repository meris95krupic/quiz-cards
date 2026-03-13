/**
 * GAME TURN ENTITY — Die Spielzug-Tabelle
 *
 * Jede Zeile repräsentiert EINEN Spielzug: Ein Spieler beantwortet EINE Karte.
 * Das Ergebnis ist entweder "correct", "wrong" oder "skip".
 *
 * Tabelle in der DB: "game_turns"
 *
 * Beziehungen:
 *   - Viele Turns gehören zu EINEM Game (N:1)
 *   - Viele Turns gehören zu EINEM GamePlayer (N:1)
 *   - Viele Turns gehören zu EINER Card (N:1)
 *
 * Das ist eine typische "Verbindungstabelle" (Junction Table), die drei Entities verbindet.
 */
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

/**
 * Enum für das Ergebnis eines Spielzugs.
 */
export enum TurnResult {
  /** Richtig beantwortet → Spieler bekommt +1 Punkt, Lern-Level +1 */
  CORRECT = 'correct',
  /** Falsch beantwortet → kein Punkt, Lern-Level -1 */
  WRONG = 'wrong',
  /** Übersprungen → kein Punkt, kein Level-Effekt, nächster Spieler ist dran */
  SKIP = 'skip',
}

@Entity('game_turns')
export class GameTurn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Rohe FK-Spalte zum Game */
  @Column({ name: 'game_id' })
  gameId: string;

  /**
   * Relation zum Game: Viele Turns gehören zu EINEM Game.
   * onDelete: 'CASCADE' → Game gelöscht → alle Turns gelöscht.
   */
  @ManyToOne(() => Game, (g) => g.turns, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'game_id' })
  game: Game;

  /** Rohe FK-Spalte zum GamePlayer */
  @Column({ name: 'game_player_id' })
  gamePlayerId: string;

  /**
   * Relation zum GamePlayer: Viele Turns gehören zu EINEM Spieler.
   * So kann man alle Züge eines bestimmten Spielers abfragen.
   */
  @ManyToOne(() => GamePlayer, (gp) => gp.turns, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'game_player_id' })
  gamePlayer: GamePlayer;

  /** Rohe FK-Spalte zur Card */
  @Column({ name: 'card_id' })
  cardId: string;

  /**
   * @ManyToOne(() => Card, { onDelete: 'CASCADE' })
   * @JoinColumn({ name: 'card_id' })
   * -------------------------------------------------
   * Relation zur Karte, die in diesem Zug gespielt wurde.
   *
   * BEACHTE: Hier gibt es KEINE inverse Seite auf der Card-Entity!
   * Das ist absichtlich — Card muss nicht wissen, in welchen Turns sie vorkam.
   * Man spart sich damit eine unnötige @OneToMany-Deklaration in Card.
   *
   * TypeORM funktioniert auch ohne inverse Seite einwandfrei.
   * Die Relation ist "unidirektional" (nur von Turn → Card, nicht umgekehrt).
   */
  @ManyToOne(() => Card, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'card_id' })
  card: Card;

  /**
   * Das Ergebnis dieses Spielzugs: correct, wrong oder skip.
   * ENUM-Typ in PostgreSQL → nur diese drei Werte sind erlaubt.
   */
  @Column({ type: 'enum', enum: TurnResult })
  result: TurnResult;

  /**
   * @CreateDateColumn({ name: 'played_at' })
   * ------------------------------------------
   * Zeitstempel, wann dieser Zug gespielt wurde.
   * Wird automatisch beim INSERT gesetzt.
   *
   * Nützlich für:
   *   - Zeitliche Auswertung ("Wie schnell hat der Spieler geantwortet?")
   *   - Sortierung der Züge in chronologischer Reihenfolge
   */
  @CreateDateColumn({ name: 'played_at' })
  playedAt: Date;
}
