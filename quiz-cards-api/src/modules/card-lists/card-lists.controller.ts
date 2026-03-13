/**
 * =====================================================================
 * CardListsController — REST-Controller für Kartenlisten
 * =====================================================================
 *
 * Ein Controller in NestJS ist dafür zuständig, HTTP-Anfragen (Requests)
 * entgegenzunehmen und an den passenden Service weiterzuleiten.
 *
 * Der Controller enthält KEINE Geschäftslogik — er ist nur die "Eingangstür"
 * für eingehende Requests. Die eigentliche Arbeit erledigt der Service.
 *
 * Wichtige Konzepte:
 * - Dekoratoren (@Get, @Post, @Delete) definieren HTTP-Methode + Route
 * - @UseGuards() schützt Endpunkte (z.B. nur für eingeloggte User)
 * - @Param() und @Body() extrahieren Daten aus dem Request
 * - @CurrentUser() ist ein Custom Decorator, der den eingeloggten User liefert
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

// Swagger-Dekoratoren: Dokumentieren die API automatisch (Swagger UI unter /api/docs)
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

// Custom Decorator: Extrahiert den aktuell eingeloggten User aus dem JWT-Token
import { CurrentUser } from '../../common/decorators/current-user.decorator';

// Guard: Schützt Routen — nur Requests mit gültigem JWT-Token kommen durch
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

import { User } from '../users/user.entity';
import { CardListsService } from './card-lists.service';
import { ImportCardListDto } from './dto/import-card-list.dto';

/**
 * @ApiTags('card-lists') → Gruppiert diese Endpunkte in Swagger unter "card-lists"
 *
 * @Controller('card-lists') → Definiert das Basis-URL-Präfix für alle Routen in
 *   diesem Controller. Alle Routen starten mit /card-lists.
 *
 * @UseGuards(JwtAuthGuard) → Wird auf KLASSEN-Ebene angewendet und schützt ALLE
 *   Routen in diesem Controller. Nur Requests mit einem gültigen JWT-Token im
 *   Authorization-Header (Bearer <token>) werden durchgelassen.
 *   Ohne gültigen Token → automatisch 401 Unauthorized.
 *
 * @ApiBearerAuth() → Zeigt in Swagger an, dass ein Bearer-Token benötigt wird.
 */
@ApiTags('card-lists')
@Controller('card-lists')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CardListsController {
  /**
   * Dependency Injection (DI) — das Kernkonzept von NestJS:
   *
   * NestJS erstellt automatisch eine Instanz von CardListsService und übergibt
   * sie hier im Constructor. Du musst NIEMALS selbst "new CardListsService()" schreiben.
   *
   * "private readonly" bedeutet:
   *   - private: nur innerhalb dieser Klasse zugänglich
   *   - readonly: kann nach der Initialisierung nicht mehr geändert werden
   */
  constructor(private readonly cardListsService: CardListsService) {}

  /**
   * GET /card-lists
   *
   * @Get() ohne Parameter → reagiert auf GET-Requests an die Basis-URL (/card-lists)
   * @ApiOperation() → Beschreibung für die Swagger-Dokumentation
   *
   * @CurrentUser() → Custom Decorator, der den User aus dem JWT-Token extrahiert.
   *   Das funktioniert so: Der JwtAuthGuard validiert den Token und hängt den User
   *   an das Request-Objekt. @CurrentUser() liest ihn dann von dort aus.
   *
   * Gibt nur die Kartenlisten des eingeloggten Users zurück (per user.id gefiltert).
   */
  @Get()
  @ApiOperation({ summary: 'List my card lists' })
  findAll(@CurrentUser() user: User) {
    return this.cardListsService.findAll(user.id);
  }

  /**
   * GET /card-lists/:id
   *
   * @Get(':id') → Definiert einen URL-Parameter ":id" (z.B. /card-lists/abc-123)
   *
   * @Param('id', ParseUUIDPipe) → Extrahiert den "id"-Parameter aus der URL.
   *   ParseUUIDPipe ist eine eingebaute NestJS-Pipe, die prüft, ob der Wert
   *   ein gültiges UUID-Format hat. Falls nicht → automatisch 400 Bad Request.
   *   Pipes sind Validierungs-/Transformations-Werkzeuge in NestJS.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get card list with all cards' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.cardListsService.findOne(id);
  }

  /**
   * POST /card-lists/import
   *
   * @Post('import') → Reagiert auf POST-Requests an /card-lists/import
   *
   * @Body() dto: ImportCardListDto → Extrahiert den Request-Body und validiert ihn
   *   automatisch gegen die ImportCardListDto-Klasse (class-validator Dekoratoren).
   *   Falls die Validierung fehlschlägt → automatisch 400 Bad Request mit Details.
   *
   * Importiert eine Kartenliste aus JSON-Daten und weist sie dem eingeloggten User zu.
   */
  @Post('import')
  @ApiOperation({ summary: 'Import a card list from JSON' })
  import(@Body() dto: ImportCardListDto, @CurrentUser() user: User) {
    return this.cardListsService.import(dto, user.id);
  }

  /**
   * DELETE /card-lists/:id
   *
   * @Delete(':id') → Reagiert auf DELETE-Requests an /card-lists/<uuid>
   *
   * @HttpCode(HttpStatus.NO_CONTENT) → Setzt den HTTP-Statuscode auf 204.
   *   Standardmäßig gibt NestJS 200 zurück, aber bei DELETE ist 204 (No Content)
   *   die REST-Konvention: "Erfolgreich gelöscht, kein Body in der Antwort."
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a card list and all its cards' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.cardListsService.remove(id);
  }
}
