/**
 * app.module.ts – Das Root-Modul (Hauptmodul) der NestJS-Anwendung.
 *
 * In NestJS ist ALLES in Modulen organisiert. Jedes Modul buendelt zusammengehoerige
 * Controller, Services und Entities. Das AppModule ist das "oberste" Modul –
 * es importiert alle anderen Module und wird in main.ts an NestFactory.create() uebergeben.
 *
 * Stell dir Module wie Lego-Bausteine vor: Jeder Baustein (Modul) hat eine bestimmte
 * Aufgabe, und das AppModule steckt sie alle zusammen.
 */

// @Module() ist ein Decorator – das zentrale Konzept von NestJS.
// Decorators sind Funktionen die mit @ beginnen und Metadaten an Klassen/Methoden haengen.
// NestJS liest diese Metadaten beim Start aus und baut daraus die App-Struktur.
import { Module } from '@nestjs/common';

// ConfigModule laedt und verwaltet die App-Konfiguration (Umgebungsvariablen).
// ConfigService ist der Injectable Service, mit dem man die Werte abfragen kann.
import { ConfigModule, ConfigService } from '@nestjs/config';

// TypeOrmModule integriert TypeORM (ein ORM = Object-Relational-Mapper) in NestJS.
// TypeORM mappt TypeScript-Klassen (Entities) auf Datenbank-Tabellen.
// Statt SQL-Queries zu schreiben, arbeitest du mit TypeScript-Objekten.
import { TypeOrmModule } from '@nestjs/typeorm';

// ThrottlerModule implementiert Rate-Limiting (Anfragen pro Zeitfenster begrenzen).
// Schuetzt die API vor Brute-Force-Angriffen und uebermässiger Nutzung.
import { ThrottlerModule } from '@nestjs/throttler';

// Eigene Konfigurationsdatei – gibt ein Objekt mit allen Umgebungsvariablen zurueck.
// Wird von ConfigModule geladen (siehe unten "load: [configuration]").
import configuration from './config/configuration';

// Joi-Validierungsschema – stellt sicher, dass alle noetige Umgebungsvariablen
// vorhanden und gueltig sind BEVOR die App startet. Fehlt z.B. INVITE_CODE,
// crashed die App sofort beim Start mit einer klaren Fehlermeldung.
import { validationSchema } from './config/validation';

// === Feature-Module (eigene Module fuer verschiedene Bereiche der App) ===
// Jedes Modul kuemmert sich um einen bestimmten Bereich (Auth, Users, Games, etc.)
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CardListsModule } from './modules/card-lists/card-lists.module';
import { GamesModule } from './modules/games/games.module';
import { ShopModule } from './modules/shop/shop.module';

// === Entities (Datenbank-Tabellen als TypeScript-Klassen) ===
// Diese werden bei TypeOrmModule.forRootAsync() registriert,
// damit TypeORM weiss welche Tabellen es verwalten soll.
import { User } from './modules/users/user.entity';
import { CardList } from './modules/card-lists/card-list.entity';
import { Card } from './modules/cards/card.entity';
import { Game } from './modules/games/game.entity';
import { GamePlayer } from './modules/games/game-player.entity';
import { GameTurn } from './modules/games/game-turn.entity';
import { CardProgress } from './modules/cards/card-progress.entity';
import { ShopSubmission } from './modules/shop/shop-submission.entity';

/**
 * @Module() Decorator – definiert dieses Root-Modul.
 *
 * Ein Modul hat typischerweise:
 * - imports:     Andere Module die dieses Modul braucht
 * - controllers: HTTP-Endpunkte (REST-Routen) die in diesem Modul leben
 * - providers:   Services und andere Injectable Klassen (Dependency Injection)
 * - exports:     Was dieses Modul anderen Modulen zur Verfuegung stellt
 *
 * Das AppModule hat nur "imports" weil es selbst keine Controller oder Services hat –
 * es dient nur als Container der alle Feature-Module zusammenfuehrt.
 */
@Module({
  imports: [
    // === ConfigModule.forRoot() – Konfigurationsmanagement ===
    // .forRoot() ist ein Pattern bei NestJS: Es initialisiert ein Modul auf ROOT-Ebene
    // (einmalig fuer die gesamte App). Im Gegensatz dazu gibt es .forFeature()
    // das in einzelnen Feature-Modulen genutzt wird.
    //
    // isGlobal: true → ConfigService ist in ALLEN Modulen verfuegbar ohne extra Import.
    //   Normalerweise muss man ein Modul in jedem Feature-Modul importieren das es nutzt.
    //   isGlobal: true erspart das – ConfigService kann ueberall injiziert werden.
    //
    // load: [configuration] → Laedt die configuration.ts Funktion. Diese gibt ein
    //   verschachteltes Objekt zurueck (z.B. { database: { host: '...' }, jwt: { secret: '...' } }).
    //   Danach kann man mit config.get('database.host') auf die Werte zugreifen.
    //
    // validationSchema → Joi-Schema das beim Start ALLE Umgebungsvariablen validiert.
    //   Fehlt z.B. INVITE_CODE, crashed die App sofort mit einer klaren Fehlermeldung.
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),

    // === TypeOrmModule.forRootAsync() – Datenbankverbindung ===
    // .forRootAsync() statt .forRoot() weil wir den ConfigService brauchen,
    // der erst NACH dem ConfigModule-Init verfuegbar ist.
    // Das "Async"-Pattern nutzt eine Factory-Funktion die spaeter aufgerufen wird.
    //
    // imports: [ConfigModule] → Dieses Modul braucht ConfigModule (fuer ConfigService).
    // inject: [ConfigService] → ConfigService wird als Parameter in useFactory injiziert.
    // useFactory: → Eine Funktion die das TypeORM-Konfigurationsobjekt zurueckgibt.
    //   Das ist Dependency Injection in Aktion: NestJS erstellt zuerst ConfigService,
    //   dann ruft es die Factory mit dem fertigen ConfigService auf.
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // Datenbanktyp – wir nutzen PostgreSQL
        type: 'postgres',
        // Verbindungsdaten kommen alle aus der Konfiguration (Umgebungsvariablen)
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.user'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.name'),
        // entities: Liste aller Entity-Klassen die TypeORM kennen soll.
        // Jede Entity-Klasse entspricht einer Datenbank-Tabelle.
        entities: [
          User,
          CardList,
          Card,
          Game,
          GamePlayer,
          GameTurn,
          CardProgress,
          ShopSubmission,
        ],
        // synchronize: true → TypeORM erstellt/aendert Tabellen automatisch passend zu den Entities.
        // ACHTUNG: Nur fuer Entwicklung! In Produktion wuerde das Daten zerstoeren koennen.
        // In Produktion nutzt man stattdessen Migrationen (vordefinierte SQL-Aenderungen).
        synchronize: config.get<string>('nodeEnv') !== 'production',
        // logging: true → TypeORM loggt alle SQL-Queries in die Konsole (nur in Development).
        // Sehr nuetzlich zum Debuggen, aber zu viel Output fuer Produktion.
        logging: config.get<string>('nodeEnv') === 'development',
        // SSL-Verbindung zur DB – noetig bei Cloud-Datenbanken (z.B. Supabase, Railway).
        // rejectUnauthorized: false → Akzeptiert auch selbst-signierte Zertifikate.
        ssl:
          config.get<string>('database.ssl') === 'true'
            ? { rejectUnauthorized: false }
            : false,
      }),
    }),

    // === ThrottlerModule – Rate Limiting (Anfragenbegrenzung) ===
    // Schuetzt die API vor Spam und Brute-Force-Angriffen.
    // Hier sind zwei Limits definiert:
    ThrottlerModule.forRoot([
      {
        // "short" – Kurzzeit-Limit: Max. 20 Anfragen pro Sekunde (1000ms).
        // Schuetzt gegen schnelle automatisierte Angriffe.
        name: 'short',
        ttl: 1000,
        limit: 20,
      },
      {
        // "medium" – Mittelfrist-Limit: Max. 200 Anfragen pro Minute (60.000ms).
        // Verhindert, dass ein einzelner Client die API ueberlastet.
        name: 'medium',
        ttl: 60_000,
        limit: 200,
      },
    ]),

    // === Feature-Module ===
    // Jedes Modul bringt seine eigenen Controller, Services und Entities mit.
    // Durch den Import hier werden sie Teil der App.
    // NestJS loest automatisch alle Abhaengigkeiten zwischen den Modulen auf.
    AuthModule, // Registrierung, Login, JWT-Authentifizierung
    UsersModule, // Benutzerverwaltung (CRUD)
    CardListsModule, // Kartenlisten erstellen, importieren, loeschen
    GamesModule, // Spiel-Logik (erstellen, beitreten, antworten, Ergebnisse)
    ShopModule, // Oeffentlicher Shop fuer geteilte Kartenlisten
  ],
})
// Die Klasse selbst ist leer – die gesamte Konfiguration steckt im @Module() Decorator.
// NestJS liest die Metadaten aus dem Decorator und baut daraus den Dependency-Graphen.
export class AppModule {}
