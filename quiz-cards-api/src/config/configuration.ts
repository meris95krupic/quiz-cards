/**
 * configuration.ts – Zentrale Konfigurationsdatei fuer die gesamte App.
 *
 * NestJS ConfigModule kann sogenannte "Configuration Factories" laden.
 * Das ist eine Funktion die ein verschachteltes Objekt zurueckgibt.
 * Danach kann man z.B. mit configService.get('database.host') auf die Werte zugreifen.
 *
 * Warum nicht direkt process.env ueberall nutzen?
 * 1. Typsicherheit: config.get<number>('port') gibt eine Zahl zurueck, process.env.PORT ist immer ein String
 * 2. Zentralisierung: Alle Env-Variablen an einem Ort → leichter zu warten
 * 3. Defaults: Fallback-Werte falls eine Variable nicht gesetzt ist (z.B. Port 3000)
 * 4. Verschachtelung: Logische Gruppierung (database.host, database.port, jwt.secret, etc.)
 * 5. Testbarkeit: In Tests kann man leicht eine andere Konfiguration injizieren
 *
 * Die ?? (Nullish Coalescing) Operatoren setzen Default-Werte:
 * Wenn die Env-Variable undefined oder null ist, wird der Fallback-Wert rechts genutzt.
 */

// export default exportiert eine anonyme Pfeilfunktion (Arrow Function).
// ConfigModule ruft diese Funktion beim App-Start auf und speichert das Ergebnis.
export default () => ({
  // Server-Port – parseInt() wandelt den String aus process.env in eine Zahl um.
  // Der zweite Parameter (10) ist die Basis (Dezimalsystem).
  port: parseInt(process.env.PORT ?? '3000', 10),

  // Umgebung: 'development', 'production' oder 'test'
  // Wird genutzt um Features je nach Umgebung ein-/auszuschalten
  // (z.B. TypeORM synchronize nur in Development, SQL-Logging nur in Development).
  nodeEnv: process.env.NODE_ENV ?? 'development',

  // Datenbank-Konfiguration – alle Werte die TypeORM fuer die PostgreSQL-Verbindung braucht.
  // In Produktion kommen diese aus echten Umgebungsvariablen (z.B. von Railway, Heroku, etc.).
  // Lokal nutzt man die Defaults oder eine .env Datei.
  database: {
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
    user: process.env.DATABASE_USER ?? 'postgres',
    password: process.env.DATABASE_PASSWORD ?? 'postgres',
    name: process.env.DATABASE_NAME ?? 'quiz_cards',
    // SSL wird als String gespeichert ('true'/'false') weil Umgebungsvariablen immer Strings sind.
    // In app.module.ts wird daraus ein Boolean/Objekt fuer TypeORM gemacht.
    ssl: process.env.DATABASE_SSL ?? 'false',
  },

  // JWT (JSON Web Token) Konfiguration fuer die Authentifizierung.
  // secret = der geheime Schluessel zum Signieren der Tokens. MUSS in Produktion sicher sein!
  // expiresIn = wie lange ein Token gueltig ist ('7d' = 7 Tage, '1h' = 1 Stunde, etc.)
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },

  // CORS-Konfiguration – welche Frontend-URL darf auf die API zugreifen.
  // In Entwicklung: Vite Dev-Server auf Port 5173. In Produktion: die echte Domain.
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  },

  // Sentry DSN (Data Source Name) fuer Fehler-Tracking in Produktion.
  // Wenn leer (''), wird Sentry in main.ts nicht initialisiert.
  sentry: {
    dsn: process.env.SENTRY_DSN ?? '',
  },

  // Einladungscode – wird bei der Registrierung abgefragt.
  // Verhindert, dass sich beliebige Personen registrieren koennen (geschlossene Beta).
  inviteCode: process.env.INVITE_CODE ?? '',

  // Admin-Email – der Benutzer mit dieser E-Mail bekommt Admin-Rechte
  // (z.B. Shop-Submissions genehmigen/ablehnen). Wird im AdminGuard geprueft.
  adminEmail: process.env.ADMIN_EMAIL ?? 'meris-k@hotmail.com',
});
