/**
 * USER ENTITY — Die Benutzer-Tabelle
 *
 * Was ist eine Entity?
 * --------------------
 * In TypeORM ist eine "Entity" eine TypeScript-Klasse, die direkt auf eine
 * Datenbank-Tabelle abgebildet ("gemappt") wird. Jede Instanz der Klasse
 * entspricht einer Zeile in der Tabelle. Jede Property mit einem @Column-
 * Dekorator wird zu einer Spalte in der Tabelle.
 *
 * TypeORM kümmert sich darum, dass:
 *  - Die Tabelle automatisch erstellt wird (wenn `synchronize: true`)
 *  - Daten als Objekte geladen und gespeichert werden können (ORM-Prinzip)
 *  - Beziehungen zwischen Tabellen über Dekoratoren definiert werden
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { GamePlayer } from '../games/game-player.entity';

/**
 * @Entity('users')
 * ----------------
 * Dieser Dekorator markiert die Klasse als Datenbank-Entity.
 * Der String 'users' ist der Name der Tabelle in PostgreSQL.
 * Ohne den String würde TypeORM den Klassennamen in Kleinbuchstaben nehmen ("user").
 * Best Practice: Immer den Tabellennamen explizit angeben, um Überraschungen zu vermeiden.
 */
@Entity('users')
export class User {
  /**
   * @PrimaryGeneratedColumn('uuid')
   * --------------------------------
   * Erstellt die Primärschlüssel-Spalte der Tabelle.
   *
   * 'uuid' bedeutet: Der Wert wird automatisch als UUID (z.B. "550e8400-e29b-41d4-a716-446655440000")
   * generiert. Alternative: 'increment' für auto-incrementierende Ganzzahlen (1, 2, 3, ...).
   *
   * UUIDs sind besser für verteilte Systeme, weil sie global eindeutig sind
   * und man sie auch clientseitig generieren kann, ohne die DB zu fragen.
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * @Column({ length: 100 })
   * -------------------------
   * Erstellt eine VARCHAR(100)-Spalte in der DB.
   * "length: 100" begrenzt die maximale Zeichenlänge auf 100.
   * Ohne "length" wäre es ein VARCHAR(255) standardmäßig.
   *
   * Der TypeScript-Typ "string" wird automatisch auf VARCHAR gemappt.
   * TypeORM leitet den SQL-Typ aus dem TS-Typ ab:
   *   string → VARCHAR, number → INTEGER, boolean → BOOLEAN, Date → TIMESTAMP
   */
  @Column({ length: 100 })
  name: string;

  /**
   * @Column({ unique: true })
   * --------------------------
   * "unique: true" erstellt einen UNIQUE-Constraint in der Datenbank.
   * Das heißt: Kein zweiter User darf die gleiche E-Mail haben.
   * Bei einem Duplikat wirft die DB einen Fehler (den man im Service abfangen sollte).
   */
  @Column({ unique: true })
  email: string;

  /**
   * @Column({ name: 'password_hash' })
   * ------------------------------------
   * "name" bestimmt den tatsächlichen Spaltennamen in der Datenbank.
   *
   * WICHTIG: In TypeScript nutzen wir camelCase (passwordHash),
   * aber in der DB nutzen wir snake_case (password_hash).
   * Der "name"-Parameter überbrückt diese Konvention.
   *
   * Hier wird der bcrypt-Hash des Passworts gespeichert — NIEMALS das Klartext-Passwort!
   */
  @Column({ name: 'password_hash' })
  passwordHash: string;

  /**
   * @Column({ name: 'avatar_id', type: 'smallint', default: 1 })
   * ---------------------------------------------------------------
   * - "type: 'smallint'" erzwingt explizit den SQL-Typ SMALLINT (spart Speicher,
   *   Wertebereich: -32768 bis 32767 — mehr als genug für Avatar-IDs).
   * - "default: 1" setzt einen Default-Wert in der DB. Wenn beim INSERT kein
   *   Wert angegeben wird, nimmt die DB automatisch 1.
   */
  @Column({ name: 'avatar_id', type: 'smallint', default: 1 })
  avatarId: number;

  /**
   * @CreateDateColumn({ name: 'created_at' })
   * -------------------------------------------
   * Spezieller TypeORM-Dekorator für Zeitstempel.
   * Der Wert wird AUTOMATISCH beim Erstellen (INSERT) auf die aktuelle Zeit gesetzt.
   * Man muss (und sollte) diesen Wert NICHT manuell setzen.
   *
   * Andere Varianten:
   *   @UpdateDateColumn — wird bei jedem UPDATE automatisch aktualisiert
   *   @DeleteDateColumn — für Soft-Deletes (Zeile wird nicht gelöscht, nur markiert)
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * @OneToMany(() => GamePlayer, (gp) => gp.user)
   * ------------------------------------------------
   * RELATION: Ein User kann an VIELEN Spielen teilnehmen → 1:N Beziehung (One-to-Many).
   *
   * Wie funktionieren Relationen in TypeORM?
   * -----------------------------------------
   * - Relationen verbinden zwei Entities über Fremdschlüssel (Foreign Keys).
   * - @OneToMany ist die "Eins"-Seite: Ein User hat VIELE GamePlayers.
   * - @ManyToOne ist die "Viele"-Seite (in GamePlayer definiert): Viele GamePlayers gehören zu EINEM User.
   * - Man braucht IMMER BEIDE Seiten, damit TypeORM die Beziehung korrekt abbildet.
   *
   * Die Parameter:
   * - () => GamePlayer — eine Funktion, die die Ziel-Entity zurückgibt (wegen zirkulärer Importe
   *   wird eine Funktion statt eines direkten Referenz benutzt).
   * - (gp) => gp.user — die "inverse side": Sagt TypeORM, welche Property in GamePlayer
   *   auf DIESE Entity zurückzeigt. Damit weiß TypeORM, dass es die gleiche Relation ist.
   *
   * WICHTIG: @OneToMany erstellt KEINE Spalte in der users-Tabelle!
   * Der Fremdschlüssel (user_id) liegt immer auf der @ManyToOne-Seite (in game_players).
   * Diese Property ist "virtuell" — sie wird nur beim Laden per JOIN befüllt.
   */
  @OneToMany(() => GamePlayer, (gp) => gp.user)
  gamePlayers: GamePlayer[];
}
