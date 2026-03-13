/**
 * AUTH CONTROLLER — Empfaengt HTTP-Anfragen und leitet sie an den AuthService weiter.
 *
 * === Was ist ein Controller in NestJS? ===
 * Ein Controller ist die "Eingangsschicht" der API. Er definiert:
 * - Welche URL-Pfade existieren (z.B. /auth/register, /auth/login)
 * - Welche HTTP-Methoden akzeptiert werden (GET, POST, PUT, DELETE)
 * - Welche Validierungen und Guards angewendet werden
 *
 * Der Controller enthaelt KEINE Geschaeftslogik — er delegiert alles an den Service.
 * Das nennt man "Separation of Concerns" (Trennung der Verantwortlichkeiten):
 *   Controller = "Was kommt rein, was geht raus?"
 *   Service    = "Wie wird es verarbeitet?"
 *
 * === Ablauf einer Anfrage ===
 * Client -> Controller -> Service -> Repository (DB) -> zurueck zum Client
 */

import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';

/**
 * @ApiTags('auth') — Swagger-Decorator: Gruppiert alle Endpunkte dieses Controllers
 * unter dem Tag "auth" in der Swagger-UI (http://localhost:3000/api/docs).
 * Das ist nur fuer die Dokumentation und hat keinen Einfluss auf die Funktionalitaet.
 *
 * @Controller('auth') — Registriert diesen Controller unter dem Pfad-Praefix "/auth".
 * Alle Routen in dieser Klasse beginnen also mit /auth/...
 * Beispiel: @Post('register') wird zu POST /auth/register
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  /**
   * Constructor Injection (Dependency Injection)
   * ---------------------------------------------
   * NestJS erstellt automatisch eine Instanz von AuthService und uebergibt sie hier.
   * Das Schluesselwort "private readonly" macht authService zu einer privaten Eigenschaft,
   * die nur innerhalb dieser Klasse verwendbar und nicht aenderbar ist.
   *
   * Warum Dependency Injection?
   * - Der Controller muss nicht wissen, WIE der AuthService erstellt wird
   * - Einfacher zu testen (man kann einen Mock-Service injizieren)
   * - NestJS verwaltet den Lebenszyklus aller Services automatisch
   */
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/register — Neuen Benutzer registrieren
   *
   * @Post('register') — Reagiert nur auf HTTP POST-Anfragen an /auth/register
   *
   * @Body() dto: RegisterDto — Der @Body()-Decorator extrahiert den Request-Body
   * und wandelt ihn in ein RegisterDto-Objekt um. NestJS nutzt dabei automatisch
   * class-validator, um die Daten zu pruefen (ist die Email gueltig? Ist das Passwort
   * lang genug?). Falls die Validierung fehlschlaegt, wird automatisch ein 400-Fehler
   * zurueckgegeben — die Methode wird gar nicht erst aufgerufen.
   *
   * === Was ist ein DTO (Data Transfer Object)? ===
   * Ein DTO definiert die Struktur der Daten, die der Client senden muss.
   * Es ist wie ein Vertrag: "Wenn du registrieren willst, musst du name, email,
   * password, avatarId und inviteCode mitschicken."
   * DTOs werden auch fuer die Swagger-Dokumentation verwendet.
   */
  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * POST /auth/login — Einloggen und JWT-Token erhalten
   *
   * Der Client schickt email + password im Body. Der AuthService prueft die
   * Credentials und gibt bei Erfolg einen JWT-Token zurueck.
   */
  @Post('login')
  @ApiOperation({ summary: 'Login and receive JWT token' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * GET /auth/me — Aktuell eingeloggten Benutzer abrufen
   *
   * === @UseGuards(JwtAuthGuard) — Der Guard-Mechanismus ===
   * Guards sind "Tuersteher" fuer Routen. Sie entscheiden, ob eine Anfrage
   * durchgelassen wird oder nicht.
   *
   * Der JwtAuthGuard funktioniert so:
   * 1. Prueft, ob ein "Authorization: Bearer <token>" Header vorhanden ist
   * 2. Verifiziert den Token mit dem JWT-Secret (wurde er manipuliert?)
   * 3. Prueft, ob der Token abgelaufen ist
   * 4. Ruft die validate()-Methode der JwtStrategy auf, die den User aus der DB laedt
   * 5. Haengt den User an das Request-Objekt an (request.user)
   *
   * Falls einer dieser Schritte fehlschlaegt: 401 Unauthorized
   * Falls alles OK: Die Route-Methode wird ausgefuehrt
   *
   * === @ApiBearerAuth() ===
   * Sagt Swagger, dass dieser Endpunkt ein Bearer-Token im Header erwartet.
   * In der Swagger-UI erscheint dann ein Schloss-Symbol.
   *
   * === @CurrentUser() user: User ===
   * @CurrentUser() ist ein Custom Decorator (selbst geschrieben), der den User
   * aus dem Request-Objekt extrahiert (request.user). Das ist eleganter als
   * direkt auf das Request-Objekt zuzugreifen.
   * Der User wurde zuvor vom JwtAuthGuard dort abgelegt.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  me(@CurrentUser() user: User) {
    /**
     * Destrukturierung: Wir entfernen passwordHash aus dem User-Objekt,
     * bevor wir es an den Client zurueckgeben. Das Passwort (auch als Hash)
     * sollte NIEMALS an den Client geschickt werden — das waere ein Sicherheitsrisiko.
     *
     * const { passwordHash: _pw, ...safeUser } = user;
     * - passwordHash wird in _pw gespeichert (und dann ignoriert)
     * - ...safeUser enthaelt alle anderen Felder (id, name, email, avatarId, etc.)
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _pw, ...safeUser } = user;
    return safeUser;
  }
}
