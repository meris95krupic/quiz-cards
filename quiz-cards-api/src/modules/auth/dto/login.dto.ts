/**
 * LOGIN DTO — Definiert die erwartete Struktur fuer Login-Anfragen.
 *
 * === Was ist ein DTO (Data Transfer Object)? ===
 * Ein DTO ist eine Klasse, die beschreibt, welche Daten der Client senden muss.
 * Es dient als "Vertrag" zwischen Frontend und Backend:
 * "Wenn du dich einloggen willst, musst du email und password mitschicken."
 *
 * === Warum DTOs statt einfacher Interfaces? ===
 * Interfaces existieren nur zur Compile-Zeit (TypeScript). Zur Laufzeit (JavaScript)
 * sind sie weg. Klassen hingegen existieren auch zur Laufzeit — und das brauchen wir,
 * damit class-validator und class-transformer funktionieren koennen.
 *
 * === Wie funktioniert die Validierung? ===
 * NestJS hat eine globale ValidationPipe, die automatisch bei jedem @Body()-Parameter
 * aktiv wird. Sie macht Folgendes:
 *
 * 1. Der rohe JSON-Body wird in eine Instanz dieser Klasse umgewandelt (class-transformer)
 * 2. Die Validierungs-Decorators (@IsEmail, @IsString, etc.) werden geprueft (class-validator)
 * 3. Falls Fehler: NestJS gibt automatisch 400 Bad Request zurueck mit Details
 * 4. Falls OK: Die validierte DTO-Instanz wird an die Controller-Methode uebergeben
 *
 * Beispiel einer automatischen Fehlerantwort:
 * {
 *   "statusCode": 400,
 *   "message": ["email must be an email", "password must be longer than or equal to 8 characters"],
 *   "error": "Bad Request"
 * }
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  /**
   * @ApiProperty() — Swagger-Decorator: Dokumentiert dieses Feld in der Swagger-UI.
   * Der example-Wert wird als Beispiel im "Try it out"-Formular angezeigt.
   * Hat keinen Einfluss auf die Validierung — ist rein fuer die Dokumentation.
   *
   * @IsEmail() — class-validator Decorator: Prueft, ob der Wert eine gueltige Email ist.
   * Nutzt intern eine Regex, die das typische Email-Format prueft (text@domain.tld).
   * Ungueltige Werte wie "abc" oder "abc@" werden abgelehnt.
   */
  @ApiProperty({ example: 'alice@example.com' })
  @IsEmail()
  email!: string;

  /**
   * @IsString() — Prueft, ob der Wert ein String ist (nicht null, number, boolean, etc.)
   *
   * @MinLength(8) — Prueft, ob der String mindestens 8 Zeichen lang ist.
   * Falls kuerzer: Fehlermeldung "password must be longer than or equal to 8 characters"
   *
   * Wichtig: Die Reihenfolge der Decorators ist von unten nach oben —
   * @MinLength wird zuerst geprueft, dann @IsString. In der Praxis ist die
   * Reihenfolge aber egal, weil class-validator ALLE Fehler sammelt und
   * zusammen zurueckgibt.
   */
  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(8)
  password!: string;
}
