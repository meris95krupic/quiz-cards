/**
 * =====================================================================
 * DTOs (Data Transfer Objects) — Validierung des Request-Bodys
 * =====================================================================
 *
 * Ein DTO definiert die FORM der Daten, die der Client (Frontend) an
 * den Server schicken darf. NestJS nutzt die Bibliothek "class-validator",
 * um eingehende Daten automatisch zu prüfen.
 *
 * Ablauf:
 * 1. Client sendet JSON im POST-Body
 * 2. NestJS wandelt das JSON in eine DTO-Instanz um (class-transformer)
 * 3. Die Validierungs-Dekoratoren prüfen jedes Feld
 * 4. Falls ungültig → automatisch 400 Bad Request mit Fehlermeldung
 * 5. Falls gültig → Controller erhält das validierte DTO-Objekt
 *
 * Vorteil: Du musst KEINE manuelle Validierung im Controller/Service schreiben!
 *
 * Swagger-Dekoratoren (@ApiProperty) dokumentieren die Felder in der
 * automatisch generierten API-Dokumentation (/api/docs).
 */

// Swagger-Dekoratoren: Definieren, wie das Feld in Swagger angezeigt wird
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Type: class-transformer-Dekorator, der verschachtelte Objekte korrekt umwandelt
import { Type } from 'class-transformer';

// class-validator-Dekoratoren: Jeder prüft eine bestimmte Bedingung
import {
  ArrayMaxSize, // Array darf maximal X Einträge haben
  ArrayMinSize, // Array muss mindestens X Einträge haben
  IsArray, // Wert muss ein Array sein
  IsEnum, // Wert muss aus einer bestimmten Enum-Liste stammen
  IsHexColor, // Wert muss eine gültige Hex-Farbe sein (#RRGGBB)
  IsInt, // Wert muss eine Ganzzahl sein
  IsOptional, // Feld darf fehlen (undefined/null)
  IsString, // Wert muss ein String sein
  Length, // String-Länge muss zwischen min und max liegen
  Max, // Zahl darf maximal X sein
  Min, // Zahl muss mindestens X sein
  ValidateIf, // Validierung nur ausführen, WENN eine Bedingung erfüllt ist
  ValidateNested, // Verschachtelte Objekte ebenfalls validieren
} from 'class-validator';

import { CardType } from '../../cards/card.entity';

/**
 * ImportCardDto — Beschreibt eine EINZELNE Karte im Import-JSON.
 *
 * Beispiel-JSON:
 * {
 *   "type": "qa",
 *   "front": "Was ist die Hauptstadt von Deutschland?",
 *   "back": "Berlin"
 * }
 *
 * Oder Multiple Choice:
 * {
 *   "type": "multiple_choice",
 *   "front": "Welche Farbe hat der Himmel?",
 *   "back": "Blau",
 *   "options": ["Rot", "Blau", "Grün", "Gelb"],
 *   "correctIndex": 1
 * }
 */
export class ImportCardDto {
  /**
   * @ApiProperty({ enum: CardType }) → Zeigt in Swagger die erlaubten Werte an.
   * @IsEnum(CardType) → Prüft, ob der Wert ein gültiger CardType ist ("qa" oder "multiple_choice").
   */
  @ApiProperty({ enum: CardType })
  @IsEnum(CardType)
  type: CardType;

  /**
   * @IsString() → Muss ein String sein (nicht number, boolean, etc.)
   * @Length(1, 2000) → Mindestens 1 Zeichen, maximal 2000 Zeichen.
   *   Length(0, ...) würde leere Strings erlauben — hier nicht gewünscht.
   */
  @ApiProperty()
  @IsString()
  @Length(1, 2000)
  front: string;

  @ApiProperty()
  @IsString()
  @Length(1, 2000)
  back: string;

  /**
   * Optionale Felder für Multiple-Choice-Karten:
   *
   * @ValidateIf((o) => o.type === CardType.MULTIPLE_CHOICE)
   *   → Diese Validierung wird NUR ausgeführt, wenn der Kartentyp "multiple_choice" ist.
   *   Für "qa"-Karten werden options und correctIndex komplett ignoriert.
   *
   * @IsArray() → Muss ein Array sein
   * @ArrayMinSize(2) → Mindestens 2 Antwortmöglichkeiten
   * @ArrayMaxSize(4) → Maximal 4 Antwortmöglichkeiten
   * @IsString({ each: true }) → JEDES Element im Array muss ein String sein.
   *   "{ each: true }" bedeutet: Validierung auf jedes Array-Element anwenden.
   */
  @ApiPropertyOptional({ type: [String], maxItems: 4 })
  @ValidateIf((o: ImportCardDto) => o.type === CardType.MULTIPLE_CHOICE)
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  options?: string[];

  /**
   * @IsInt() → Muss eine Ganzzahl sein (nicht 1.5, nicht "1")
   * @Min(0) / @Max(3) → Index muss zwischen 0 und 3 liegen (da max. 4 Optionen)
   *
   * Das "?" am Ende (correctIndex?) bedeutet: TypeScript erlaubt undefined.
   * @ValidateIf() stellt sicher, dass es bei Multiple Choice trotzdem pflicht ist.
   */
  @ApiPropertyOptional({ minimum: 0, maximum: 3 })
  @ValidateIf((o: ImportCardDto) => o.type === CardType.MULTIPLE_CHOICE)
  @IsInt()
  @Min(0)
  @Max(3)
  correctIndex?: number;

  /**
   * Optionale Hintergrundfarbe für die Karte.
   *
   * @IsOptional() → Feld darf komplett fehlen (anders als @ValidateIf,
   *   das die Validierung bedingt ausführt, überspringt @IsOptional alle
   *   nachfolgenden Validierungen, wenn der Wert undefined/null ist).
   * @IsHexColor() → Muss ein gültiger Hex-Farbcode sein (#FF6584).
   */
  @ApiPropertyOptional({ example: '#FF6584' })
  @IsOptional()
  @IsHexColor()
  bgColor?: string;
}

/**
 * ImportCardListDto — Beschreibt die gesamte Kartenliste im Import-JSON.
 *
 * Beispiel-JSON:
 * {
 *   "title": "Meine Kartenliste",
 *   "description": "Beschreibung (optional)",
 *   "bgColor": "#6C63FF",
 *   "cards": [ ... ]   ← Array von ImportCardDto-Objekten
 * }
 */
export class ImportCardListDto {
  @ApiProperty()
  @IsString()
  @Length(1, 255)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @ApiPropertyOptional({ example: '#6C63FF' })
  @IsOptional()
  @IsHexColor()
  bgColor?: string;

  /**
   * @IsArray() → Muss ein Array sein
   * @ArrayMinSize(1) → Mindestens eine Karte muss enthalten sein
   *
   * @ValidateNested({ each: true }) → Validiert JEDES Objekt im Array
   *   mit den class-validator-Dekoratoren der ImportCardDto-Klasse.
   *   Ohne "{ each: true }" würde nur das Array selbst geprüft, nicht die Inhalte.
   *
   * @Type(() => ImportCardDto) → WICHTIG! class-transformer muss wissen,
   *   in welche Klasse die verschachtelten Objekte umgewandelt werden sollen.
   *   Ohne @Type() wären die Objekte nur "plain objects" und die Validierung
   *   der ImportCardDto-Felder würde NICHT greifen!
   */
  @ApiProperty({ type: [ImportCardDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ImportCardDto)
  cards: ImportCardDto[];
}
