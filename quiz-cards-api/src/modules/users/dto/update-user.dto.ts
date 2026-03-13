/**
 * =====================================================================
 * UpdateUserDto — DTO für das Aktualisieren von User-Daten
 * =====================================================================
 *
 * Dieses DTO wird bei PATCH /users/:id verwendet, um den Namen
 * und/oder den Avatar eines Users zu aktualisieren.
 *
 * Beide Felder sind optional (@IsOptional), weil PATCH ein TEILWEISES
 * Update ist: Der Client schickt nur die Felder mit, die sich ändern sollen.
 *
 * Beispiel-Requests:
 *   { "name": "Bob" }              → Nur Name ändern
 *   { "avatarId": 5 }              → Nur Avatar ändern
 *   { "name": "Bob", "avatarId": 5 } → Beides ändern
 *   {}                              → Nichts ändern (aber valide!)
 *
 * class-validator prüft automatisch:
 * - Ist name ein String mit 1-100 Zeichen?
 * - Ist avatarId eine Ganzzahl zwischen 1 und 10?
 * Falls nicht → 400 Bad Request mit detaillierter Fehlermeldung.
 */

// ApiPropertyOptional: Swagger-Dekorator für optionale Felder
// (zeigt in Swagger an, dass das Feld weggelassen werden darf)
import { ApiPropertyOptional } from '@nestjs/swagger';

import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class UpdateUserDto {
  /**
   * Optionaler neuer Benutzername.
   *
   * @ApiPropertyOptional({ example: 'Bob' }) → Swagger zeigt "Bob" als Beispielwert
   * @IsOptional() → Feld darf fehlen (undefined). ALLE nachfolgenden Validierungen
   *   werden übersprungen, wenn der Wert undefined oder null ist.
   * @IsString() → Muss ein String sein (nicht Zahl, Boolean, etc.)
   * @Length(1, 100) → Mindestens 1, maximal 100 Zeichen
   */
  @ApiPropertyOptional({ example: 'Bob' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  /**
   * Optionale neue Avatar-ID.
   *
   * @IsInt() → Muss eine Ganzzahl sein (nicht 1.5 oder "1")
   * @Min(1) → Mindestens 1 (es gibt keine Avatar-ID 0)
   * @Max(10) → Maximal 10 (es gibt 10 verschiedene Avatare)
   *
   * Das "?" am Feldnamen (avatarId?) bedeutet in TypeScript:
   * Der Wert kann auch undefined sein — zusammen mit @IsOptional()
   * ist das Feld komplett freiwillig.
   */
  @ApiPropertyOptional({ example: 5, minimum: 1, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  avatarId?: number;
}
