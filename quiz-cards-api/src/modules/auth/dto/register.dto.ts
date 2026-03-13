/**
 * REGISTER DTO — Definiert die erwartete Struktur fuer Registrierungs-Anfragen.
 *
 * Dieses DTO verlangt mehr Felder als das LoginDto, weil bei der Registrierung
 * zusaetzliche Informationen benoetigt werden: Name, Avatar und Einladungscode.
 *
 * === class-validator Decorators (Uebersicht der hier verwendeten) ===
 *
 * @IsString()     — Wert muss ein String sein
 * @IsEmail()      — Wert muss eine gueltige Email-Adresse sein
 * @IsInt()        — Wert muss eine Ganzzahl sein (keine Dezimalzahl)
 * @Length(min,max) — String muss zwischen min und max Zeichen lang sein
 * @MinLength(n)   — String muss mindestens n Zeichen lang sein
 * @Min(n)         — Zahl muss mindestens n sein
 * @Max(n)         — Zahl darf maximal n sein
 *
 * Alle Decorators generieren automatisch lesbare Fehlermeldungen auf Englisch,
 * z.B. "name must be longer than or equal to 1 characters".
 * Man kann eigene Fehlermeldungen setzen: @IsString({ message: 'Muss ein Text sein' })
 *
 * === Weitere nuetzliche Decorators (nicht hier verwendet, aber gut zu wissen) ===
 * @IsOptional()   — Feld darf fehlen (undefined). Ohne diesen Decorator ist jedes Feld Pflicht.
 * @IsNotEmpty()   — String darf nicht leer sein ("")
 * @IsUUID()       — Muss eine gueltige UUID sein
 * @IsBoolean()    — Muss true oder false sein
 * @IsArray()      — Muss ein Array sein
 * @IsEnum(MyEnum) — Wert muss einem der Enum-Werte entsprechen
 * @Matches(/regex/) — Wert muss zur Regex passen (z.B. Passwort-Komplexitaet)
 * @ValidateNested() — Validiert verschachtelte Objekte (zusammen mit @Type(() => OtherDto))
 */

import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsString,
  Length,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  /**
   * Name des Benutzers.
   *
   * @IsString() — Muss ein String sein (kein null, number, etc.)
   * @Length(1, 100) — Muss zwischen 1 und 100 Zeichen lang sein.
   *   - Mindestens 1: Verhindert leere Namen
   *   - Maximal 100: Schuetzt vor absurd langen Eingaben (DB-Spalten haben oft ein Limit)
   */
  @ApiProperty({ example: 'Alice' })
  @IsString()
  @Length(1, 100)
  name!: string;

  /**
   * Email-Adresse — wird auch als Login-Name verwendet.
   *
   * @IsEmail() prueft das Format automatisch. In der DB ist email als UNIQUE definiert,
   * sodass keine zwei User die gleiche Email haben koennen. Die Duplikat-Pruefung
   * findet aber im AuthService statt (nicht hier im DTO).
   */
  @ApiProperty({ example: 'alice@example.com' })
  @IsEmail()
  email!: string;

  /**
   * Passwort im Klartext — wird im AuthService mit bcrypt gehasht, bevor es
   * in die Datenbank geschrieben wird. Wird NIEMALS als Klartext gespeichert!
   *
   * @MinLength(8) — Mindestens 8 Zeichen fuer ein Minimum an Sicherheit.
   * Fuer Produktionsanwendungen koennte man noch @Matches() hinzufuegen,
   * um z.B. Grossbuchstaben, Zahlen oder Sonderzeichen zu erzwingen:
   *   @Matches(/^(?=.*[A-Z])(?=.*\d)/, { message: 'Passwort muss Grossbuchstabe + Zahl enthalten' })
   */
  @ApiProperty({ example: 'password123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  /**
   * Avatar-ID — eine Zahl zwischen 1 und 10, die den gewaehlten Avatar repraesentiert.
   * Das Frontend zeigt verschiedene Avatar-Bilder an, die ueber diese ID identifiziert werden.
   *
   * @IsInt() — Muss eine Ganzzahl sein (3 ist OK, 3.5 nicht)
   * @Min(1)  — Kleinster erlaubter Wert
   * @Max(10) — Groesster erlaubter Wert
   *
   * Zusammen stellen @Min und @Max sicher, dass nur gueltige Avatar-IDs akzeptiert werden.
   */
  @ApiProperty({ example: 3, minimum: 1, maximum: 10 })
  @IsInt()
  @Min(1)
  @Max(10)
  avatarId!: number;

  /**
   * Einladungscode — Schutzmechanismus fuer die Registrierung.
   * Nur wer den richtigen Code kennt, darf sich registrieren.
   * Der erwartete Code steht in der .env-Datei (INVITE_CODE).
   *
   * Die eigentliche Pruefung gegen den erwarteten Code findet im AuthService statt.
   * Hier pruefen wir nur, ob ueberhaupt ein String mit mindestens 4 Zeichen gesendet wurde.
   */
  @ApiProperty({ example: 'quiz2024' })
  @IsString()
  @MinLength(4)
  inviteCode!: string;
}
