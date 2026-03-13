/**
 * ============================================================================
 * CREATE GAME DTO — Datentransfer-Objekt für die Spiel-Erstellung
 * ============================================================================
 *
 * Was ist ein DTO (Data Transfer Object)?
 * ────────────────────────────────────────
 * Ein DTO definiert die FORM der Daten, die der Client an den Server schickt.
 * Es ist wie ein Vertrag: "Wenn du ein Spiel erstellen willst, musst du
 * mir genau DIESE Felder in genau DIESEM Format schicken."
 *
 * Warum nicht einfach ein TypeScript-Interface verwenden?
 * ──────────────────────────────────────────────────────
 * Interfaces existieren nur zur Compile-Zeit (sie werden zu nichts kompiliert).
 * Klassen existieren auch zur Laufzeit! Das ist wichtig, weil:
 *   - class-validator die Dekoratoren (@IsUUID) zur LAUFZEIT ausliest
 *   - NestJS' ValidationPipe die Klasse braucht, um die Validierung durchzuführen
 *   - Swagger die @ApiProperty-Dekoratoren nutzt, um die Doku zu generieren
 *
 * VALIDIERUNGS-ABLAUF:
 *   1. Client schickt JSON: { "cardListId": "abc-123" }
 *   2. NestJS' ValidationPipe erstellt eine CreateGameDto-Instanz
 *   3. class-validator prüft @IsUUID() → ist "abc-123" eine gültige UUID?
 *   4. Falls NEIN → automatisch 400 Bad Request mit Fehlermeldung
 *   5. Falls JA → die DTO-Instanz wird an den Controller übergeben
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateGameDto {
  /**
   * @ApiProperty() — Swagger-Dekorator: Beschreibt dieses Feld in der
   * automatisch generierten API-Dokumentation (/api/docs).
   * Ohne @ApiProperty() wäre das Feld in Swagger unsichtbar.
   *
   * @IsUUID() — class-validator-Dekorator: Stellt sicher, dass der Wert
   * eine gültige UUID ist (z.B. "550e8400-e29b-41d4-a716-446655440000").
   * Wenn der Client eine ungültige UUID schickt → 400 Bad Request.
   */
  @ApiProperty({ description: 'ID of the card list to play with' })
  @IsUUID()
  cardListId: string;
}
