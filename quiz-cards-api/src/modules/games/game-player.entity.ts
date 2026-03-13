/**
 * GAME PLAYER ENTITY — Die Spieler-in-einem-Spiel-Tabelle
 *
 * Verbindet einen Spieler mit einem bestimmten Spiel.
 * Enthält spielspezifische Daten wie Score, Reihenfolge und Session-Token.
 *
 * Es gibt ZWEI Arten von Spielern:
 *   1. Registrierte User → userId ist gesetzt (für Lernfortschritt-Tracking)
 *   2. Gast-Spieler ("Quick Players") → userId ist NULL, nur Name + Avatar
 *
 * Tabelle in der DB: "game_players"
 *
 * Beziehungen:
 *   - Viele GamePlayers gehören zu EINEM Game (N:1)
 *   - Viele GamePlayers gehören zu EINEM User, OPTIONAL (N:1, nullable)
 *   - Ein GamePlayer hat VIELE GameTurns (1:N)
 */
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

  /**
   * Rohe FK-Spalte zum Game.
   */
  @Column({ name: 'game_id' })
  gameId: string;

  /**
   * @ManyToOne(() => Game, (g) => g.players, { onDelete: 'CASCADE' })
   * @JoinColumn({ name: 'game_id' })
   * ------------------------------------------------------------------
   * Relation zum Game: Viele GamePlayers gehören zu EINEM Game.
   *
   * (g) => g.players → Rückverweis auf das players-Array in der Game-Entity.
   * So weiß TypeORM, dass Game.players und GamePlayer.game die GLEICHE Beziehung sind.
   *
   * onDelete: 'CASCADE' → Wenn das Game gelöscht wird, werden alle GamePlayers mitgelöscht.
   */
  @ManyToOne(() => Game, (g) => g.players, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'game_id' })
  game: Game;

  /**
   * Optionale FK-Spalte zum User.
   * NULL für Gast-Spieler, die sich nicht registriert haben.
   */
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  /**
   * @ManyToOne(() => User, (u) => u.gamePlayers, { nullable: true, onDelete: 'SET NULL' })
   * @JoinColumn({ name: 'user_id' })
   * ---------------------------------------------------------------------------------------
   * OPTIONALE Relation zum User.
   *
   * nullable: true — nicht jeder Spieler ist ein registrierter User.
   * Quick Players (Gäste) spielen ohne Account, daher ist userId NULL.
   *
   * onDelete: 'SET NULL' — Wenn ein User seinen Account löscht:
   *   - Der GamePlayer-Eintrag bleibt bestehen (Spiel-Ergebnisse gehen nicht verloren)
   *   - Die user_id wird auf NULL gesetzt (der Spieler ist dann quasi "anonym")
   *
   * VERGLEICH der onDelete-Strategien in diesem Projekt:
   *   Game → GamePlayer:     CASCADE   (Game weg → Spieler-Einträge weg)
   *   User → GamePlayer:     SET NULL  (User weg → Spieler bleiben, nur user_id = NULL)
   *   CardList → Card:       CASCADE   (Liste weg → Karten weg)
   *   CardList → Game:       SET NULL  (Liste weg → Game bleibt, card_list_id = NULL)
   */
  @ManyToOne(() => User, (u) => u.gamePlayers, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  /**
   * Name des Spielers (wird bei der Erstellung gesetzt).
   * Bei registrierten Usern: der Benutzername.
   * Bei Gästen: der vom Host eingegebene Name.
   */
  @Column({ length: 100 })
  name: string;

  /**
   * Avatar-ID des Spielers (referenziert ein Avatar-Bild im Frontend).
   * "smallint" → kleiner Integer, spart Speicher.
   */
  @Column({ name: 'avatar_id', type: 'smallint' })
  avatarId: number;

  /**
   * Punktestand des Spielers in diesem Spiel.
   * Startet bei 0, wird bei richtigen Antworten erhöht.
   */
  @Column({ type: 'int', default: 0 })
  score: number;

  /**
   * Reihenfolge-Position des Spielers (0, 1, 2, ...).
   * Bestimmt, welcher Spieler wann an der Reihe ist.
   * Die Karten rotieren durch die Spieler nach turnOrder.
   */
  @Column({ name: 'turn_order', type: 'int' })
  turnOrder: number;

  /**
   * @Column({ name: 'session_token', type: 'varchar', length: 36, nullable: true })
   * ---------------------------------------------------------------------------------
   * Ein UUID-Token, das den Browser/Tab des Spielers identifiziert.
   *
   * Warum? Bei Online-Spielen muss das Frontend wissen, welcher Spieler auf
   * DIESEM Gerät sitzt. Der sessionToken wird in sessionStorage gespeichert
   * und bei jedem Polling-Request mitgesendet.
   *
   * Wenn `currentPlayer.sessionToken === meinSessionToken`, zeigt das Frontend
   * die Karte + Antwort-Buttons an. Sonst zeigt es den Warte-Bildschirm.
   *
   * Length 36 → Format einer UUID: "550e8400-e29b-41d4-a716-446655440000"
   */
  @Column({
    name: 'session_token',
    type: 'varchar',
    length: 36,
    nullable: true,
  })
  sessionToken: string | null;

  /**
   * 1:N Relation: Ein Spieler hat VIELE Spielzüge.
   * KEIN Cascade hier — Turns werden über das Game gespeichert, nicht über den Player.
   */
  @OneToMany(() => GameTurn, (gt) => gt.gamePlayer)
  turns: GameTurn[];
}
