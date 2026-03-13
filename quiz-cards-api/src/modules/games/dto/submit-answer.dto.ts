/**
 * ============================================================================
 * SUBMIT ANSWER DTO — Datentransfer-Objekt für das Einreichen einer Antwort
 * ============================================================================
 *
 * Dieses DTO zeigt den Umgang mit ENUMS in der Validierung.
 *
 * TurnResult ist ein TypeScript-Enum:
 *   enum TurnResult { CORRECT = 'correct', WRONG = 'wrong', SKIP = 'skip' }
 *
 * @IsEnum(TurnResult) stellt sicher, dass nur einer dieser drei Werte
 * akzeptiert wird. Wenn der Client z.B. "maybe" schickt → 400 Bad Request.
 *
 * ZWEI ANTWORT-MODI:
 *   1. Frage-Antwort-Karten: Das Frontend entscheidet, ob die Antwort
 *      richtig oder falsch war und schickt "correct" oder "wrong"
 *   2. Multiple-Choice-Karten: Das Frontend schickt den chosenIndex,
 *      und der SERVER prüft automatisch ob die Antwort stimmt.
 *      (Siehe submitAnswer() im Service)
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { TurnResult } from '../game-turn.entity';

export class SubmitAnswerDto {
  /**
   * result — Das Ergebnis des Zuges: correct, wrong oder skip.
   *
   * @IsEnum(TurnResult) — Validiert gegen die erlaubten Enum-Werte.
   * Im Gegensatz zu @IsIn(['correct', 'wrong', 'skip']) ist @IsEnum()
   * typsicher und passt sich automatisch an, wenn das Enum erweitert wird.
   *
   * Bei Multiple-Choice-Karten wird dieses Feld im Service eventuell
   * ÜBERSCHRIEBEN: Wenn chosenIndex mitgeliefert wird, berechnet der
   * Server das tatsächliche Ergebnis selbst (Schutz vor Client-Manipulation).
   */
  @ApiProperty({ enum: TurnResult, description: 'correct | wrong | skip' })
  @IsEnum(TurnResult)
  result: TurnResult;

  /**
   * chosenIndex — Der gewählte Antwort-Index bei Multiple-Choice-Karten.
   *
   * Optional, weil er nur bei Multiple-Choice-Karten relevant ist.
   * Bei Frage-Antwort-Karten wird dieses Feld nicht mitgeschickt.
   *
   * @IsInt() + @Min(0) — Muss eine nicht-negative ganze Zahl sein.
   * Der Index ist 0-basiert: 0 = erste Antwort, 1 = zweite, etc.
   *
   * Im Service wird dann geprüft:
   *   if (chosenIndex === card.correctIndex) → TurnResult.CORRECT
   *   else → TurnResult.WRONG
   */
  @ApiPropertyOptional({
    description: 'Chosen option index for multiple_choice cards (0-based)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  chosenIndex?: number;
}
