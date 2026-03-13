/**
 * AUTH MODULE — Das zentrale Modul fuer Authentifizierung in dieser NestJS-App.
 *
 * === Was ist ein Modul in NestJS? ===
 * Ein Modul (@Module) ist ein Organisationscontainer. Es buendelt zusammengehoerige
 * Controller, Services und andere Provider. NestJS nutzt ein modulares System —
 * jede Funktionalitaet (Auth, Users, Games...) bekommt ihr eigenes Modul.
 * Das AppModule importiert dann alle Feature-Module.
 *
 * === Was macht dieses Modul? ===
 * Es konfiguriert alles, was fuer JWT-Authentifizierung noetig ist:
 * 1. Zugriff auf die User-Datenbanktabelle (TypeORM)
 * 2. Passport fuer die Authentifizierungsstrategie
 * 3. JWT-Modul zum Erstellen und Verifizieren von Tokens
 * 4. Den AuthService (Geschaeftslogik) und die JwtStrategy (Token-Validierung)
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User } from '../users/user.entity';

/**
 * @Module() ist ein Decorator, der diese Klasse als NestJS-Modul markiert.
 * Der Decorator bekommt ein Konfigurationsobjekt mit 4 moeglichen Feldern:
 *   - imports:     Andere Module, die dieses Modul braucht
 *   - providers:   Services/Strategien, die NestJS per Dependency Injection bereitstellen soll
 *   - controllers: Controller, die HTTP-Anfragen entgegennehmen
 *   - exports:     Was andere Module nutzen duerfen, wenn sie dieses Modul importieren
 */
@Module({
  imports: [
    /**
     * TypeOrmModule.forFeature([User])
     * --------------------------------
     * Registriert die User-Entity fuer dieses Modul, damit wir im AuthService
     * per @InjectRepository(User) auf die User-Tabelle in der DB zugreifen koennen.
     * Ohne diese Zeile wuerde NestJS einen Fehler werfen: "Repository User not found".
     *
     * forFeature() ist fuer Feature-Module (hier Auth).
     * forRoot() wird nur einmal im AppModule aufgerufen, um die DB-Verbindung zu konfigurieren.
     */
    TypeOrmModule.forFeature([User]),

    /**
     * PassportModule
     * --------------
     * Passport ist eine bekannte Node.js-Bibliothek fuer Authentifizierung.
     * @nestjs/passport ist der NestJS-Wrapper dafuer. Passport arbeitet mit "Strategien" —
     * z.B. JWT-Strategie, Google-OAuth-Strategie, Local-Strategie (Username/Passwort).
     *
     * Hier importieren wir das PassportModule, damit unsere JwtStrategy funktioniert.
     * Passport kuemmert sich darum, den HTTP-Request zu analysieren, das Token zu extrahieren
     * und die richtige Strategie aufzurufen.
     */
    PassportModule,

    /**
     * JwtModule.registerAsync(...)
     * ----------------------------
     * Das JwtModule stellt den JwtService bereit, mit dem wir JWT-Tokens erstellen
     * (sign) und verifizieren (verify) koennen.
     *
     * === Was ist ein JWT (JSON Web Token)? ===
     * Ein JWT ist ein signierter Token-String, der Daten enthaelt (z.B. User-ID).
     * Format: header.payload.signature (Base64-codiert, durch Punkte getrennt)
     * - Header: Algorithmus (z.B. HS256)
     * - Payload: Die Daten (z.B. { sub: "user-id-123", email: "alice@..." })
     * - Signature: Wird mit dem Secret erstellt — damit kann der Server pruefen,
     *   dass der Token nicht manipuliert wurde.
     *
     * Der Client schickt den Token bei jeder Anfrage im Header mit:
     *   Authorization: Bearer eyJhbGciOiJI...
     *
     * === registerAsync vs register ===
     * registerAsync() erlaubt uns, die Konfiguration asynchron zu laden.
     * Wir brauchen das, weil das JWT-Secret aus der Konfiguration (ConfigService) kommt,
     * die erst zur Laufzeit verfuegbar ist.
     *
     * - imports: [ConfigModule] — damit der ConfigService hier verfuegbar ist
     * - inject: [ConfigService] — wird in die useFactory-Funktion injiziert
     * - useFactory: Funktion, die die JWT-Optionen zurueckgibt
     */
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        /**
         * secret: Der geheime Schluessel zum Signieren der Tokens.
         * WICHTIG: Muss geheim bleiben! Niemals ins Repository committen.
         * Kommt hier aus der .env-Datei via ConfigService.
         */
        secret: config.get<string>('jwt.secret'),
        signOptions: {
          /**
           * expiresIn: Wie lange ein Token gueltig ist.
           * '7d' = 7 Tage. Danach muss sich der User neu einloggen.
           * Andere Beispiele: '1h' (1 Stunde), '30m' (30 Minuten), '365d' (1 Jahr)
           */
          expiresIn: (config.get<string>('jwt.expiresIn') ?? '7d') as never,
        },
      }),
    }),
  ],

  /**
   * providers: Services und andere injectable Klassen fuer dieses Modul.
   *
   * - AuthService:  Enthaelt die Geschaeftslogik (Register, Login, Token erstellen)
   * - JwtStrategy:  Die Passport-Strategie, die bei geschuetzten Routen den Token validiert
   *
   * NestJS erstellt automatisch Instanzen dieser Klassen und injiziert sie dort,
   * wo sie per Constructor-Injection angefordert werden (= Dependency Injection).
   */
  providers: [AuthService, JwtStrategy],

  /**
   * controllers: Hier registrieren wir den AuthController,
   * der die HTTP-Endpunkte (POST /auth/register, POST /auth/login, GET /auth/me) bereitstellt.
   */
  controllers: [AuthController],

  /**
   * exports: [JwtModule]
   * --------------------
   * Dadurch koennen andere Module, die AuthModule importieren, den JwtService nutzen.
   * Zum Beispiel koennte ein anderes Modul pruefen, ob ein Token gueltig ist.
   */
  exports: [JwtModule],
})
export class AuthModule {}
