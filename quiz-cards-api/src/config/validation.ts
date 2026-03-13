/**
 * validation.ts – Joi-Validierungsschema fuer Umgebungsvariablen.
 *
 * Dieses Schema wird beim App-Start von ConfigModule.forRoot() ausgefuehrt.
 * Es prueft, ob ALLE noetige Umgebungsvariablen vorhanden und gueltig sind,
 * BEVOR die App ueberhaupt startet.
 *
 * Warum ist das wichtig?
 * Ohne Validierung wuerde die App erst spaeter crashen (z.B. wenn die DB-Verbindung fehlschlaegt
 * weil DATABASE_HOST fehlt). Mit Joi-Validierung bekommt man SOFORT beim Start eine klare
 * Fehlermeldung wie: "INVITE_CODE is required".
 *
 * Joi ist eine maechtiges Validierungsbibliothek fuer JavaScript/TypeScript.
 * Sie wird hier NICHT fuer Request-Validierung genutzt (dafuer nutzt NestJS class-validator),
 * sondern NUR fuer die Umgebungsvariablen-Validierung beim Start.
 */

// Joi wird als Namespace importiert (import * as Joi), d.h. alle Joi-Funktionen
// sind unter dem Joi-Objekt verfuegbar (Joi.object(), Joi.string(), Joi.number(), etc.)
import * as Joi from 'joi';

// Joi.object() erstellt ein Schema-Objekt. Jeder Key entspricht einer Umgebungsvariable.
// Die Methoden-Ketten (.string().min(16).default(...)) definieren die Validierungsregeln.
export const validationSchema = Joi.object({
  // PORT muss eine Zahl sein. Falls nicht gesetzt, wird 3000 als Default verwendet.
  // .default() setzt den Wert automatisch wenn die Variable fehlt.
  PORT: Joi.number().default(3000),

  // NODE_ENV darf nur einen der drei Werte haben: 'development', 'production' oder 'test'.
  // .valid() beschraenkt die erlaubten Werte – alles andere wird abgelehnt.
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  // Datenbank-Variablen – alle mit sinnvollen Defaults fuer lokale Entwicklung.
  // So funktioniert die App "out of the box" mit einer lokalen PostgreSQL-Instanz.
  DATABASE_HOST: Joi.string().default('localhost'),
  DATABASE_PORT: Joi.number().default(5432),
  DATABASE_USER: Joi.string().default('postgres'),
  // .allow('') erlaubt einen leeren String. Ohne .allow('') wuerde Joi einen leeren
  // String als ungueltig ablehnen (weil Joi.string() standardmaessig leere Strings verbietet).
  // Das ist noetig weil manche lokale PostgreSQL-Installationen kein Passwort haben.
  DATABASE_PASSWORD: Joi.string().allow('').default(''),
  DATABASE_NAME: Joi.string().default('quiz_cards'),

  // JWT_SECRET muss mindestens 16 Zeichen lang sein (.min(16)).
  // Ein zu kurzer Secret waere unsicher – Angreifer koennten den Token leichter faelschen.
  // In Produktion sollte das ein langer, zufaelliger String sein (z.B. 64+ Zeichen).
  JWT_SECRET: Joi.string().min(16).default('dev-secret-change-me'),
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  // CORS_ORIGIN – die erlaubte Frontend-URL. Default ist der Vite Dev-Server.
  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),

  // SENTRY_DSN – Optional (erlaubt leeren String). Wenn leer, wird Sentry nicht aktiviert.
  SENTRY_DSN: Joi.string().allow('').default(''),

  // INVITE_CODE – .required() bedeutet: Diese Variable MUSS gesetzt sein!
  // Ohne INVITE_CODE kann sich niemand registrieren (geschlossene Beta).
  // .min(4) stellt sicher, dass der Code mindestens 4 Zeichen lang ist.
  // Wenn INVITE_CODE fehlt, crasht die App beim Start mit einer klaren Fehlermeldung.
  // Das ist beabsichtigt – die App soll nicht ohne Einladungscode laufen.
  INVITE_CODE: Joi.string().min(4).required(),
});
