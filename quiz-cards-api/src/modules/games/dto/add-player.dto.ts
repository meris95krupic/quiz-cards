/**
 * ============================================================================
 * ADD PLAYER DTO — Datentransfer-Objekt für das Hinzufügen eines Spielers
 * ============================================================================
 *
 * Dieses DTO zeigt ein wichtiges Muster: OPTIONALE vs. PFLICHTFELDER.
 *
 * Wir haben zwei Spieler-Modi:
 *   1. Quick Play:        Nur name + avatarId nötig (userId ist leer)
 *   2. Registrierter User: name + avatarId + userId
 *
 * Durch @IsOptional() wird userId zu einem optionalen Feld.
 * class-validator überspringt alle anderen Validatoren (@IsUUID),
 * wenn das Feld undefined oder null ist.
 *
 * VALIDIERUNGS-KASKADE für userId:
 *   - Feld nicht vorhanden? → @IsOptional() sagt "ist OK, überspringe"
 *   - Feld vorhanden?       → @IsUUID() prüft ob es eine gültige UUID ist
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';

export class AddPlayerDto {
  /**
   * userId — Optionale Verknüpfung mit einem registrierten Benutzer.
   *
   * @ApiPropertyOptional() statt @ApiProperty() → Swagger zeigt das Feld
   * als optional an (kein Sternchen * in der Swagger-UI).
   *
   * @IsOptional() → Wenn dieses Feld fehlt oder null ist, werden alle
   * weiteren Validatoren (@IsUUID) übersprungen. Ohne @IsOptional()
   * würde @IsUUID() fehlschlagen wenn userId nicht mitgeschickt wird.
   */
  @ApiPropertyOptional({
    description: 'Registered user ID (Modus B). Leave empty for quick play.',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  /**
   * name — Anzeigename des Spielers (Pflichtfeld).
   *
   * @IsString() — Stellt sicher, dass es ein String ist (kein Number, Boolean, etc.)
   * @Length(1, 100) — Mindestens 1, maximal 100 Zeichen.
   *   Das verhindert leere Namen UND extrem lange Strings (DB-Schutz).
   */
  @ApiProperty({ description: 'Display name (required for quick play)' })
  @IsString()
  @Length(1, 100)
  name: string;

  /**
   * avatarId — Die ID des gewählten Avatar-Bildes (1-10).
   *
   * Hier werden MEHRERE Validatoren kombiniert:
   * @IsInt()  → Muss eine ganze Zahl sein (kein Float wie 1.5)
   * @Min(1)   → Mindestens 1
   * @Max(10)  → Maximal 10
   *
   * Die Validatoren werden in Reihenfolge geprüft. Wenn @IsInt() fehlschlägt,
   * werden @Min() und @Max() trotzdem noch geprüft → der Client bekommt
   * ALLE Fehler auf einmal zurück (nicht nur den ersten).
   */
  @ApiProperty({ minimum: 1, maximum: 10 })
  @IsInt()
  @Min(1)
  @Max(10)
  avatarId: number;
}
