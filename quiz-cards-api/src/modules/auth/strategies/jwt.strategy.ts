/**
 * JWT STRATEGY — Die Passport-Strategie zur Validierung von JWT-Tokens.
 *
 * === Was ist eine Passport-Strategie? ===
 * Passport.js ist ein Authentifizierungs-Framework fuer Node.js. Es arbeitet mit
 * "Strategien" — austauschbare Plugins, die verschiedene Authentifizierungsmethoden
 * implementieren. Beispiele:
 *   - passport-jwt:    Token im Authorization-Header pruefen (das nutzen wir hier)
 *   - passport-local:  Username + Passwort in einem Login-Formular
 *   - passport-google: Google OAuth 2.0
 *   - passport-github: GitHub OAuth
 *
 * === Wie funktioniert die JWT-Strategie? ===
 * Wenn ein geschuetzter Endpunkt aufgerufen wird (mit @UseGuards(JwtAuthGuard)):
 *
 * 1. Passport extrahiert den Token aus dem Header: "Authorization: Bearer eyJ..."
 * 2. Passport prueft die Signatur mit dem Secret (wurde der Token manipuliert?)
 * 3. Passport prueft, ob der Token abgelaufen ist (expiresIn)
 * 4. Falls alles OK: Die validate()-Methode DIESER Klasse wird aufgerufen
 * 5. validate() laedt den User aus der DB und gibt ihn zurueck
 * 6. Der zurueckgegebene User wird an request.user angehaengt
 *
 * Falls irgendwo ein Fehler auftritt → 401 Unauthorized
 *
 * === Warum brauchen wir validate()? ===
 * Der Token enthaelt nur die User-ID und Email (Payload). Wir wollen aber
 * das vollstaendige User-Objekt aus der DB, um z.B. den Namen, Avatar etc.
 * verfuegbar zu haben. Ausserdem pruefen wir so, ob der User noch existiert
 * (er koennte ja geloescht worden sein, seit der Token erstellt wurde).
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/user.entity';

/**
 * Interface fuer den JWT-Payload — die Daten, die im Token gespeichert sind.
 *
 * - sub: "Subject" — die User-ID (Standard-Claim gemaess JWT-Spezifikation RFC 7519)
 * - email: Die Email-Adresse des Users
 *
 * Diese Daten werden in auth.service.ts beim Erstellen des Tokens festgelegt:
 *   jwtService.sign({ sub: user.id, email: user.email })
 */
export interface JwtPayload {
  sub: string;
  email: string;
}

/**
 * @Injectable() — Damit NestJS diese Klasse per Dependency Injection verwalten kann.
 *
 * PassportStrategy(Strategy)
 * --------------------------
 * PassportStrategy() ist eine Mixin-Funktion von @nestjs/passport.
 * Sie verbindet eine Passport-Strategie (hier: passport-jwt's Strategy)
 * mit dem NestJS-System. Die Klasse muss dann eine validate()-Methode implementieren.
 *
 * Standardmaessig registriert sich diese Strategie unter dem Namen 'jwt'.
 * Deswegen nutzt der JwtAuthGuard automatisch diese Strategie, wenn er
 * mit @UseGuards(JwtAuthGuard) aktiviert wird.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    /**
     * @InjectRepository(User) — Injiziert das TypeORM-Repository fuer die User-Tabelle.
     * Damit koennen wir in validate() den User anhand der ID aus der DB laden.
     */
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {
    /**
     * super() — Ruft den Konstruktor der Elternklasse (passport-jwt Strategy) auf.
     * Hier konfigurieren wir, WIE Passport den Token finden und pruefen soll:
     */
    super({
      /**
       * jwtFromRequest: WO soll Passport den Token suchen?
       *
       * ExtractJwt.fromAuthHeaderAsBearerToken() bedeutet:
       * Suche im "Authorization"-Header nach dem Schema "Bearer <token>".
       * Beispiel: "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
       *
       * Andere Moeglichkeiten waeren z.B.:
       * - ExtractJwt.fromUrlQueryParameter('token') — aus der URL (?token=...)
       * - ExtractJwt.fromBodyField('token')         — aus dem Request-Body
       */
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      /**
       * ignoreExpiration: false — Abgelaufene Tokens werden NICHT akzeptiert.
       * Wenn der Token aelter als die expiresIn-Zeit ist (z.B. 7 Tage),
       * wird automatisch 401 Unauthorized zurueckgegeben.
       *
       * Wuerde man hier true setzen, waeren Tokens fuer immer gueltig — ein Sicherheitsrisiko!
       */
      ignoreExpiration: false,

      /**
       * secretOrKey: Der geheime Schluessel zum Verifizieren der Token-Signatur.
       * Muss der GLEICHE Schluessel sein, der zum Signieren verwendet wurde
       * (in auth.module.ts bei JwtModule.registerAsync).
       *
       * Das '!' am Ende ist der TypeScript Non-Null Assertion Operator:
       * Wir sagen dem Compiler: "Dieser Wert ist definitiv nicht null/undefined."
       * (Wir vertrauen darauf, dass jwt.secret in der .env gesetzt ist.)
       */
      secretOrKey: configService.get<string>('jwt.secret')!,
    });
  }

  /**
   * validate() — Wird von Passport aufgerufen, NACHDEM der Token erfolgreich
   * verifiziert wurde (Signatur OK, nicht abgelaufen).
   *
   * @param payload - Der entschluesselte Token-Payload ({ sub: "user-id", email: "..." })
   * @returns Das vollstaendige User-Objekt aus der Datenbank
   *
   * === Was passiert mit dem Rueckgabewert? ===
   * Der zurueckgegebene User wird automatisch an request.user angehaengt.
   * Danach kann er im Controller ueber @CurrentUser() abgerufen werden:
   *   @Get('me')
   *   me(@CurrentUser() user: User) { return user; }
   *
   * Falls der User nicht in der DB gefunden wird (z.B. Account geloescht),
   * werfen wir eine UnauthorizedException (401).
   */
  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
