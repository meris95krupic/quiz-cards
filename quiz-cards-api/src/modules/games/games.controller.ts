/**
 * ============================================================================
 * GAMES CONTROLLER — Die HTTP-Schnittstelle für alle Spiel-Endpunkte
 * ============================================================================
 *
 * Ein Controller in NestJS ist verantwortlich für:
 *   1. HTTP-Requests entgegennehmen (GET, POST, PUT, DELETE usw.)
 *   2. Request-Daten extrahieren (Body, Params, Query)
 *   3. Die eigentliche Arbeit an den Service delegieren
 *   4. Die Antwort zurückgeben
 *
 * WICHTIG: Ein Controller enthält KEINE Geschäftslogik!
 * Er ist nur der "Türsteher" — er prüft die Anfrage und leitet sie weiter.
 * Die gesamte Logik (Datenbankzugriffe, Berechnungen) steckt im Service.
 *
 * Dieses Muster nennt man "Separation of Concerns" (Trennung der Zuständigkeiten).
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GamesService } from './games.service';
import { CreateGameDto } from './dto/create-game.dto';
import { AddPlayerDto } from './dto/add-player.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import type { User } from '../users/user.entity';

/**
 * @ApiTags('games') — Swagger-Gruppierung: Alle Endpunkte in diesem Controller
 * erscheinen unter dem Tag "games" in der Swagger-UI (/api/docs).
 *
 * @Controller('games') — Definiert den Basis-Pfad für alle Routen in diesem
 * Controller. Alle Routen hier beginnen also mit "/games".
 */
@ApiTags('games')
@Controller('games')
export class GamesController {
  /**
   * DEPENDENCY INJECTION (DI) — Das Herzstück von NestJS!
   *
   * Statt den Service manuell zu erstellen (new GamesService(...)), deklarieren
   * wir ihn einfach als Constructor-Parameter mit "private readonly".
   *
   * NestJS erkennt den Typ "GamesService", schaut in seinem DI-Container nach,
   * findet die Instanz (die im Module als Provider registriert wurde) und
   * übergibt sie automatisch. Das nennt man "Constructor Injection".
   *
   * Vorteile von DI:
   *   - Testbarkeit: Im Unit-Test kann man den Service durch ein Mock ersetzen
   *   - Lose Kopplung: Controller weiß nichts über die Implementierung
   *   - Singleton: NestJS erstellt nur EINE Instanz pro Modul
   */
  constructor(private readonly gamesService: GamesService) {}

  /**
   * POST /games — Neues Spiel erstellen
   *
   * @Post() ohne Argument = der Basis-Pfad des Controllers ("/games").
   * @Body() extrahiert den JSON-Body der Anfrage und validiert ihn automatisch
   * gegen die CreateGameDto-Klasse (dank ValidationPipe in main.ts).
   *
   * Wenn die Validierung fehlschlägt (z.B. cardListId fehlt oder ist kein UUID),
   * gibt NestJS automatisch eine 400 Bad Request-Antwort zurück.
   */
  @Post()
  @ApiOperation({ summary: 'Create a new game in LOBBY status' })
  create(@Body() dto: CreateGameDto) {
    return this.gamesService.create(dto);
  }

  /**
   * GET /games/:id — Einzelnes Spiel abrufen (mit Spielern und Kartenliste)
   *
   * @Get(':id') — Der :id-Teil ist ein URL-Parameter (z.B. /games/abc-123-def).
   * @Param('id', ParseUUIDPipe) — Extrahiert den Parameter UND validiert,
   * dass es eine gültige UUID ist. Falls nicht → 400 Bad Request automatisch.
   *
   * ParseUUIDPipe ist eine eingebaute NestJS "Pipe". Pipes transformieren
   * oder validieren Eingabedaten, BEVOR sie die Route-Handler-Methode erreichen.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get game status and players' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.gamesService.findOne(id);
  }

  /**
   * GET /games/:id/state — Spielzustand für Polling abrufen
   *
   * Dies ist der WICHTIGSTE Endpunkt für Online-Multiplayer!
   * Das Frontend ruft diesen Endpunkt alle 2,5 Sekunden auf (Polling),
   * um den aktuellen Spielzustand zu erfahren:
   *   - Welcher Spieler ist dran?
   *   - Welche Karte wird gerade angezeigt?
   *   - Ist das Spiel schon beendet?
   *
   * Alternative wäre WebSockets, aber Polling ist einfacher zu implementieren
   * und reicht für unseren Anwendungsfall aus.
   */
  @Get(':id/state')
  @ApiOperation({
    summary: 'Get full game state for polling (lobby/playing/finished)',
  })
  getState(@Param('id', ParseUUIDPipe) id: string) {
    return this.gamesService.getState(id);
  }

  /**
   * POST /games/:id/players — Spieler zur Lobby hinzufügen
   *
   * Hier werden zwei Dekoratoren für Parameter verwendet:
   *   - @Param('id') → aus der URL
   *   - @Body()      → aus dem JSON-Body (der AddPlayerDto)
   *
   * NestJS kann mehrere Parameter-Quellen in einer Methode kombinieren.
   */
  @Post(':id/players')
  @ApiOperation({ summary: 'Add a player to the game lobby' })
  addPlayer(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddPlayerDto) {
    return this.gamesService.addPlayer(id, dto);
  }

  /**
   * POST /games/:id/start — Spiel starten (Status LOBBY → IN_PROGRESS)
   *
   * @HttpCode(HttpStatus.OK) — Normalerweise gibt POST einen 201 (Created)
   * Statuscode zurück. Aber "Spiel starten" erstellt keine neue Ressource,
   * sondern ändert eine bestehende. Deshalb überschreiben wir den
   * Standard-Statuscode mit 200 (OK).
   */
  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start the game (LOBBY → IN_PROGRESS)' })
  start(@Param('id', ParseUUIDPipe) id: string) {
    return this.gamesService.start(id);
  }

  /**
   * GET /games/:id/current-card — Aktuelle Karte und aktuellen Spieler abrufen
   */
  @Get(':id/current-card')
  @ApiOperation({ summary: 'Get current card and whose turn it is' })
  getCurrentCard(@Param('id', ParseUUIDPipe) id: string) {
    return this.gamesService.getCurrentCard(id);
  }

  /**
   * POST /games/:id/answer — Antwort für aktuelle Karte einreichen
   *
   * Der Body enthält das Ergebnis (correct/wrong/skip) und optional
   * den gewählten Index bei Multiple-Choice-Karten.
   *
   * Im Service wird diese Methode innerhalb einer TRANSAKTION ausgeführt,
   * um Race Conditions bei gleichzeitigen Anfragen zu verhindern.
   * (Mehr dazu im Service-Kommentar bei submitAnswer.)
   */
  @Post(':id/answer')
  @ApiOperation({
    summary: 'Submit answer for current card (correct/wrong/skip)',
  })
  submitAnswer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitAnswerDto,
  ) {
    return this.gamesService.submitAnswer(id, dto);
  }

  /**
   * GET /games/:id/results — Endergebnis und Rangliste abrufen
   *
   * Kann erst aufgerufen werden, wenn das Spiel den Status FINISHED hat.
   */
  @Get(':id/results')
  @ApiOperation({ summary: 'Get final results and ranking' })
  getResults(@Param('id', ParseUUIDPipe) id: string) {
    return this.gamesService.getResults(id);
  }

  /**
   * GET /games/progress/:listId — Lernfortschritt für eine Kartenliste
   *
   * @UseGuards(JwtAuthGuard) — Dieser Endpunkt ist GESCHÜTZT!
   * Nur authentifizierte Benutzer mit gültigem JWT-Token können darauf zugreifen.
   *
   * Ein Guard ist wie ein Türsteher: Er prüft, ob der Request berechtigt ist,
   * BEVOR die Controller-Methode ausgeführt wird. Falls nicht → 401 Unauthorized.
   *
   * @ApiBearerAuth() — Swagger-Markierung, zeigt in der Swagger-UI das
   * Schloss-Symbol an, damit man weiß, dass ein Bearer-Token nötig ist.
   *
   * @CurrentUser() — Ein CUSTOM DECORATOR (in common/decorators/ definiert).
   * Er extrahiert den authentifizierten User aus dem Request-Objekt.
   * Der JwtAuthGuard hat den User vorher dort hineingesetzt, nachdem
   * er den JWT-Token verifiziert hat.
   *
   * Ablauf: Request → JwtAuthGuard prüft Token → setzt req.user → @CurrentUser() liest req.user
   */
  @Get('progress/:listId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get learning progress for a card list (auth required)',
  })
  getProgress(
    @Param('listId', ParseUUIDPipe) listId: string,
    @CurrentUser() user: User,
  ) {
    return this.gamesService.getListProgress(user.id, listId);
  }
}
