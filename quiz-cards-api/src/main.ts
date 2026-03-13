/**
 * main.ts – Der Einstiegspunkt der gesamten NestJS-Anwendung.
 *
 * Diese Datei wird beim Serverstart als Erstes ausgefuehrt.
 * Hier passiert alles, was VOR dem eigentlichen Request-Handling konfiguriert werden muss:
 * Sicherheit, Validierung, Fehlerbehandlung, Dokumentation, etc.
 *
 * Das Muster: Eine async bootstrap()-Funktion erstellt die App und konfiguriert sie.
 * NestJS nutzt dieses Pattern, weil viele Setup-Schritte asynchron sind (z.B. DB-Verbindung).
 */

// NestFactory ist die "Fabrik", die eine NestJS-App-Instanz erzeugt.
// Sie nimmt das Root-Modul (AppModule) und erstellt daraus den gesamten Dependency-Injection-Container.
import { NestFactory } from '@nestjs/core';

// ValidationPipe ist eine eingebaute NestJS-Pipe.
// Pipes transformieren und validieren eingehende Daten BEVOR sie den Controller erreichen.
// Zusammen mit class-validator Decorators (@IsString(), @IsEmail() etc.) in DTOs
// sorgt die ValidationPipe dafuer, dass nur gueltige Daten durchkommen.
import { ValidationPipe } from '@nestjs/common';

// Swagger = automatische API-Dokumentation. DocumentBuilder baut die Konfiguration,
// SwaggerModule generiert daraus eine interaktive Web-UI unter /api/docs.
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// ConfigService erlaubt typsicheren Zugriff auf Umgebungsvariablen (aus .env / process.env).
// Statt ueberall process.env.XYZ zu schreiben, nutzt man config.get<string>('pfad.zum.wert').
// Die Werte kommen aus der configuration.ts Datei (siehe config/configuration.ts).
import { ConfigService } from '@nestjs/config';

// Helmet setzt diverse HTTP-Security-Header (z.B. X-Content-Type-Options, X-Frame-Options).
// Das schuetzt vor gaengigen Web-Angriffen wie Clickjacking, MIME-Sniffing, etc.
import helmet from 'helmet';

// AppModule ist das Root-Modul – es importiert ALLE anderen Module der App.
// NestJS baut daraus den gesamten Abhaengigkeitsbaum (Dependency Graph).
import { AppModule } from './app.module';

// AllExceptionsFilter faengt ALLE unbehandelten Exceptions ab und gibt eine
// einheitliche Fehler-Response zurueck. Ohne diesen Filter wuerden unerwartete
// Fehler als haessliche 500er-Responses an den Client gehen.
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

// LoggingInterceptor protokolliert jede eingehende HTTP-Anfrage mit Dauer (ms).
// Interceptors sind wie "Middleware auf Steroids" – sie koennen VOR und NACH
// dem Controller-Handler Code ausfuehren (z.B. Request-Timing, Response-Transformation).
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

// Eigener Logger der in Dateien schreibt (statt nur in die Konsole).
import { FileLogger } from './common/logger/file-logger';

/**
 * bootstrap() – Die Hauptfunktion, die den Server hochfaehrt.
 * Wird ganz unten mit `void bootstrap()` aufgerufen.
 */
async function bootstrap() {
  // NestFactory.create() erstellt die App-Instanz.
  // Das erste Argument (AppModule) ist das Root-Modul – der Startpunkt des Dependency-Graphen.
  // Das zweite Argument ist ein Options-Objekt. Hier uebergeben wir einen eigenen Logger,
  // damit NestJS-interne Logs (z.B. "Nest application successfully started") in Dateien landen.
  const app = await NestFactory.create(AppModule, {
    logger: new FileLogger(),
  });

  // app.get(ConfigService) holt den ConfigService aus dem Dependency-Injection-Container.
  // Das ist das gleiche wie @Inject(ConfigService) in einem Controller/Service,
  // nur dass wir hier ausserhalb des DI-Kontexts sind (in main.ts).
  const config = app.get(ConfigService);

  // === SICHERHEIT ===

  // app.use() registriert Express-Middleware. Helmet ist Standard-Middleware
  // fuer HTTP-Security-Header. Man sollte Helmet IMMER in Produktions-Apps nutzen.
  app.use(helmet());

  // CORS (Cross-Origin Resource Sharing) erlaubt dem Frontend (z.B. auf localhost:5173)
  // Anfragen an das Backend (auf localhost:3000) zu senden.
  // Ohne CORS wuerde der Browser die Requests blockieren (Same-Origin-Policy).
  // 'origin' bestimmt, welche Domain(s) zugreifen duerfen.
  app.enableCors({
    origin: config.get<string>('cors.origin'),
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // === GLOBALE PIPES / FILTERS / INTERCEPTORS ===
  // NestJS hat ein "Request Lifecycle"-Konzept. Jede Anfrage durchlaeuft:
  // Middleware → Guards → Interceptors (vor) → Pipes → Controller → Interceptors (nach) → Filter (bei Fehlern)
  // "Global" bedeutet: gilt fuer ALLE Routen der App, nicht nur fuer einzelne Controller.

  // useGlobalPipes() registriert Pipes die auf JEDEN eingehenden Request angewendet werden.
  // Die ValidationPipe validiert automatisch alle DTOs (Data Transfer Objects) mit class-validator.
  app.useGlobalPipes(
    new ValidationPipe({
      // whitelist: true → Entfernt alle Properties aus dem Request-Body,
      // die NICHT im DTO definiert sind. Schuetzt vor unerwuenschten Feldern.
      whitelist: true,
      // forbidNonWhitelisted: true → Wirft einen Fehler wenn unbekannte Properties geschickt werden
      // (statt sie nur stillschweigend zu entfernen wie bei whitelist allein).
      forbidNonWhitelisted: true,
      // transform: true → Wandelt den eingehenden Plain-Object automatisch in eine DTO-Klassen-Instanz um.
      // Ausserdem konvertiert es Typen (z.B. String "3" wird zu Number 3 wenn der DTO @IsNumber() hat).
      transform: true,
    }),
  );

  // useGlobalFilters() registriert Exception-Filter.
  // Filter fangen Fehler ab und erzeugen eine einheitliche Fehler-Response.
  // Ohne diesen Filter wuerden manche Fehler als unstrukturierter 500er zurueckgehen.
  app.useGlobalFilters(new AllExceptionsFilter());

  // useGlobalInterceptors() registriert Interceptors.
  // Der LoggingInterceptor loggt jede Anfrage mit Method, URL und Antwortzeit.
  // Interceptors koennen auch die Response transformieren oder cachen.
  app.useGlobalInterceptors(new LoggingInterceptor());

  // === SENTRY (Error-Tracking) ===
  // Sentry ist ein externer Dienst der Fehler in Produktion trackt.
  // Nur aktiviert wenn eine DSN (Data Source Name = Sentry-URL) konfiguriert ist.
  // Dynamic import (await import()) damit das Sentry-Paket nur geladen wird wenn noetig.
  const sentryDsn = config.get<string>('sentry.dsn');
  if (sentryDsn) {
    const Sentry = await import('@sentry/node');
    Sentry.init({ dsn: sentryDsn });
  }

  // === SWAGGER (API-Dokumentation) ===
  // Swagger generiert automatisch eine interaktive API-Doku aus deinen Controllern und DTOs.
  // Das ist extrem nuetzlich zum Testen und Dokumentieren der API.
  // DocumentBuilder nutzt das Builder-Pattern (Methoden-Verkettung) fuer die Konfiguration.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Quiz Cards API')
    .setDescription('REST API for the Quiz Cards web application')
    .setVersion('1.0')
    // addBearerAuth() fuegt einen "Authorize"-Button in die Swagger-UI hinzu,
    // damit man JWT-Tokens direkt in der Doku testen kann.
    .addBearerAuth()
    .build();

  // createDocument() analysiert alle Controller, DTOs und Decorators und baut daraus
  // eine OpenAPI-Spezifikation (JSON-Dokument das die gesamte API beschreibt).
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  // setup() macht die Swagger-UI unter dem angegebenen Pfad erreichbar.
  // Hier: http://localhost:3000/api/docs
  SwaggerModule.setup('api/docs', app, document);

  // === SERVER STARTEN ===
  // Der Port kommt aus der Konfiguration (process.env.PORT) oder faellt auf 3000 zurueck.
  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);
  console.log(`Quiz Cards API running on http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

// void bootstrap() ruft die Funktion auf und verwirft das Promise-Ergebnis explizit.
// "void" sagt TypeScript/ESLint: "Ja, ich weiss dass das ein Promise ist, ich brauche
// das Ergebnis aber nicht." Ohne "void" wuerde ESLint warnen (no-floating-promises Regel).
void bootstrap();
