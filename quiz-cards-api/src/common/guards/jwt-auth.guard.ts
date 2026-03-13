/**
 * ============================================================================
 * JWT AUTH GUARD (JWT-Authentifizierungs-Waechter)
 * ============================================================================
 *
 * NestJS Request-Lifecycle:
 *   Middleware → **GUARD** → Interceptor → Pipe → Route-Handler → ...
 *
 * Ein "Guard" in NestJS entscheidet, ob eine Anfrage WEITERVERARBEITET wird oder nicht.
 * Guards sind wie Tuersteher — sie pruefen Bedingungen und lassen den Request entweder
 * durch oder blocken ihn (401 Unauthorized / 403 Forbidden).
 *
 * Typische Anwendungsfaelle fuer Guards:
 * - Authentifizierung: "Ist der User eingeloggt?" (wie dieser Guard hier)
 * - Autorisierung: "Hat der User die richtige Rolle?" (z.B. AdminGuard)
 * - Rate-Limiting: "Hat der User zu viele Anfragen gesendet?"
 *
 * Wie funktioniert dieser Guard?
 * --------------------------------
 * 1. NestJS + Passport-Integration:
 *    - @nestjs/passport stellt die Klasse "AuthGuard" bereit
 *    - AuthGuard('jwt') sagt: "Benutze die JWT-Strategie" (definiert in auth/jwt.strategy.ts)
 *    - Die JWT-Strategie prueft den "Authorization: Bearer <token>" Header
 *    - Wenn der Token gueltig ist → request.user wird mit den User-Daten befuellt
 *    - Wenn der Token ungueltig/abgelaufen ist → 401 Unauthorized
 *
 * 2. Warum eine eigene Klasse und nicht direkt AuthGuard('jwt') verwenden?
 *    - Man kann die Klasse spaeter erweitern (z.B. zusaetzliche Logik einbauen)
 *    - Man hat einen sprechenden Namen: @UseGuards(JwtAuthGuard) statt @UseGuards(AuthGuard('jwt'))
 *    - Man kann den Guard einfach im Dependency-Injection-System registrieren
 *
 * Verwendung in Controllern:
 * --------------------------------
 *   @UseGuards(JwtAuthGuard)        // <-- Schuetzt diese Route
 *   @Get('me')
 *   getProfile(@CurrentUser() user: User) {
 *     return user;
 *   }
 *
 * Ohne den Guard kann JEDER die Route aufrufen — mit dem Guard nur eingeloggte User.
 * ============================================================================
 */

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * @Injectable() — Macht die Klasse fuer NestJS Dependency Injection (DI) verfuegbar.
 *
 * Dependency Injection ist ein Kernkonzept von NestJS:
 * - Klassen deklarieren ihre Abhaengigkeiten im Konstruktor
 * - NestJS erstellt und verwaltet die Instanzen automatisch
 * - @Injectable() markiert eine Klasse als "verwaltbar" durch das DI-System
 *
 * Auch wenn dieser Guard keinen Konstruktor mit Abhaengigkeiten hat,
 * braucht er @Injectable(), weil NestJS ihn instanziieren muss,
 * wenn er mit @UseGuards() verwendet wird.
 *
 * AuthGuard('jwt') — Basisklasse von @nestjs/passport:
 * - 'jwt' ist der Name der Passport-Strategie (registriert in JwtStrategy)
 * - Die Basisklasse kuemmert sich um:
 *   1. Token aus dem Request-Header extrahieren
 *   2. Token mit dem JWT_SECRET verifizieren
 *   3. Die validate()-Methode der JwtStrategy aufrufen
 *   4. Das Ergebnis an request.user anhaengen
 *
 * "extends" = Vererbung: JwtAuthGuard ERBT alle Funktionalitaet von AuthGuard('jwt').
 * Der leere Body {} bedeutet: Wir aendern nichts am Standardverhalten.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
