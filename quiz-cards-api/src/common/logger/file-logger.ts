/**
 * ============================================================================
 * FILE LOGGER (Datei-Logger mit Rotation)
 * ============================================================================
 *
 * NestJS hat einen eingebauten Logger (die Logger-Klasse), der standardmaessig
 * nur in die Konsole (stdout) schreibt. In Produktion will man Logs aber auch
 * in DATEIEN speichern, damit man sie spaeter analysieren kann.
 *
 * Dieser FileLogger ersetzt den Standard-Logger und schreibt in BEIDES:
 * - Konsole (stdout) → fuer Live-Debugging waehrend der Entwicklung
 * - Datei (logs/app.log) → fuer spaetere Analyse und Bug-Reproduktion
 *
 * Log-Rotation:
 * - Wenn app.log groesser als 5 MB wird, wird sie umbenannt (rotiert)
 * - Alte Logs: app.1.log → app.2.log → app.3.log (max. 3 alte Dateien)
 * - Die aelteste Datei wird geloescht → verhindert, dass die Festplatte volllaeuft
 *
 * Wie wird der Logger in NestJS registriert?
 * -------------------------------------------
 * In main.ts:
 *   const app = await NestFactory.create(AppModule, {
 *     logger: new FileLogger(),  // <-- Ersetzt den Standard-Logger
 *   });
 *
 * Danach nutzen ALLE Logger-Instanzen im Code (new Logger('HTTP'), etc.)
 * automatisch diesen FileLogger als Backend.
 * ============================================================================
 */

import { LoggerService, LogLevel } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Konstanten fuer die Log-Rotation.
 * "const" = unveraenderbar (Konstante), wird nie neu zugewiesen.
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB in Bytes (5 * 1024 KB * 1024 Bytes)
const MAX_FILES = 3; // Maximal 3 alte Log-Dateien behalten

/**
 * "implements LoggerService" — Das NestJS-Interface fuer Custom-Logger.
 *
 * LoggerService schreibt vor, welche Methoden ein Logger haben MUSS:
 * - log()     → Normale Informationen (z.B. "Server gestartet")
 * - error()   → Fehler (z.B. "Datenbank-Verbindung fehlgeschlagen")
 * - warn()    → Warnungen (z.B. "Veraltete API-Version benutzt")
 * - debug()   → Debug-Infos (z.B. "Query dauerte 3ms") — nur in Entwicklung relevant
 * - verbose() → Sehr detaillierte Infos (selten benutzt)
 *
 * NICHT @Injectable(): Dieser Logger wird NICHT ueber Dependency Injection
 * bereitgestellt, sondern direkt im NestFactory.create()-Aufruf uebergeben.
 * Das liegt daran, dass der Logger BEVOR das DI-System initialisiert wird benoetigt wird.
 */
export class FileLogger implements LoggerService {
  /** Pfad zum Log-Verzeichnis (z.B. /app/logs/) */
  private logDir: string;
  /** Pfad zur aktuellen Log-Datei (z.B. /app/logs/app.log) */
  private logPath: string;
  /**
   * fs.WriteStream — Ein "Stream" zum effizienten Schreiben in Dateien.
   * Statt bei jedem Log-Eintrag die Datei zu oeffnen und zu schliessen,
   * haelt der Stream die Datei offen → viel schneller bei vielen Schreibvorgaengen.
   */
  private stream: fs.WriteStream;

  /**
   * Konstruktor — wird einmal ausgefuehrt, wenn der Logger erstellt wird.
   *
   * 1. Log-Verzeichnis bestimmen (im Projektordner unter "logs/")
   * 2. Verzeichnis erstellen, falls es nicht existiert
   * 3. WriteStream oeffnen (flags: 'a' = append/anhaengen, nicht ueberschreiben)
   */
  constructor() {
    // process.cwd() = aktuelles Arbeitsverzeichnis (wo "npm run start" ausgefuehrt wird)
    this.logDir = path.join(process.cwd(), 'logs');
    // existsSync = synchrone Pruefung, ob der Ordner existiert
    // mkdirSync mit { recursive: true } = erstellt auch Eltern-Ordner, falls noetig
    if (!fs.existsSync(this.logDir))
      fs.mkdirSync(this.logDir, { recursive: true });
    this.logPath = path.join(this.logDir, 'app.log');
    // flags: 'a' → Append-Modus: Neue Zeilen werden AM ENDE der Datei angefuegt
    // (ohne 'a' wuerde die Datei bei jedem Neustart ueberschrieben!)
    this.stream = fs.createWriteStream(this.logPath, { flags: 'a' });
  }

  /**
   * log() — Fuer normale Informationen.
   * Wird z.B. aufgerufen bei: this.logger.log('Server gestartet auf Port 3000')
   * @param context — Optionaler Kontext-String (z.B. 'HTTP', 'GamesService')
   */
  log(message: string, context?: string) {
    this.write('LOG', message, context);
  }

  /**
   * error() — Fuer Fehlermeldungen.
   * Bekommt optional einen Stack-Trace (die Aufrufkette, wo der Fehler passiert ist).
   * Der Stack-Trace wird als separate Zeile geloggt, damit er nicht abgeschnitten wird.
   */
  error(message: string, trace?: string, context?: string) {
    this.write('ERROR', message, context);
    if (trace) this.write('ERROR', trace, context);
  }

  /** warn() — Fuer Warnungen (nicht kritisch, aber beachtenswert) */
  warn(message: string, context?: string) {
    this.write('WARN', message, context);
  }

  /** debug() — Fuer detaillierte Debug-Informationen (nur in Entwicklung nuetzlich) */
  debug(message: string, context?: string) {
    this.write('DEBUG', message, context);
  }

  /** verbose() — Fuer sehr detaillierte Infos (selten benutzt) */
  verbose(message: string, context?: string) {
    this.write('VERBOSE', message, context);
  }

  /**
   * setLogLevels() — NestJS ruft diese Methode auf, um Log-Level zu konfigurieren.
   * Wir ignorieren sie (no-op), weil wir ALLES loggen wollen — in der Datei
   * ist Speicherplatz guenstig, und man kann spaeter filtern.
   *
   * eslint-disable-next-line: Unterdrueckt die ESLint-Warnung "Parameter nicht benutzt",
   * weil wir _levels absichtlich ignorieren (das Interface verlangt den Parameter aber).
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setLogLevels(_levels: LogLevel[]) {
    // no-op — wir loggen alles in die Datei
  }

  /**
   * write() — Interne Hilfsmethode (private = nur innerhalb dieser Klasse aufrufbar).
   *
   * Formatiert eine Log-Zeile und schreibt sie in Konsole UND Datei.
   *
   * Format: "2024-03-15T14:30:00.000Z LOG     [HTTP] GET /api/games → 42ms"
   *         |-- Zeitstempel --------|  |Level|  |Ctx|  |-- Nachricht --|
   *
   * @param level   — Log-Level (LOG, ERROR, WARN, DEBUG, VERBOSE)
   * @param message — Die eigentliche Nachricht
   * @param context — Optionaler Kontext (z.B. Klassenname)
   */
  private write(level: string, message: string, context?: string) {
    const ts = new Date().toISOString(); // ISO-Format: "2024-03-15T14:30:00.000Z"
    const ctx = context ? `[${context}]` : ''; // z.B. "[HTTP]" oder leer
    // padEnd(7) → fuellt den String auf 7 Zeichen auf (z.B. "LOG    ") → saubere Ausrichtung
    const line = `${ts} ${level.padEnd(7)} ${ctx} ${message}`;

    // 1. Konsole (stdout) — wie der Standard-NestJS-Logger
    process.stdout.write(line + '\n');

    // 2. Datei — ueber den persistenten WriteStream
    this.stream.write(line + '\n');

    // Nach jedem Schreiben pruefen, ob die Datei rotiert werden muss
    this.rotateIfNeeded();
  }

  /**
   * rotateIfNeeded() — Prueft die Dateigroesse und rotiert bei Bedarf.
   *
   * Log-Rotation funktioniert so (wie ein Foerderband):
   *
   * VORHER:                    NACHHER:
   * app.log     (5.1 MB)  →   app.1.log  (5.1 MB, umbenannt)
   * app.1.log   (4.8 MB)  →   app.2.log  (4.8 MB, umbenannt)
   * app.2.log   (4.5 MB)  →   app.3.log  (4.5 MB, umbenannt)
   * app.3.log   (3.9 MB)  →   GELOESCHT  (ueber MAX_FILES hinaus)
   *                            app.log    (0 Bytes, neue leere Datei)
   *
   * Das try/catch faengt Fehler ab, die bei Dateizugriffen passieren koennen
   * (z.B. Dateisystem voll, Berechtigungsfehler). Wir ignorieren diese Fehler,
   * weil ein fehlgeschlagenes Log-Rotate kein Grund ist, die Anwendung zu crashen.
   */
  private rotateIfNeeded() {
    try {
      // statSync() gibt Datei-Metadaten zurueck (Groesse, Erstellungsdatum, etc.)
      const stats = fs.statSync(this.logPath);
      // Wenn die Datei kleiner als MAX_FILE_SIZE ist → nichts tun
      if (stats.size < MAX_FILE_SIZE) return;

      // Stream schliessen, bevor wir die Datei umbenennen
      this.stream.end();

      /**
       * Dateien von hinten nach vorne verschieben (damit keine Dateien ueberschrieben werden):
       * i=3: app.2.log → app.3.log (falls app.3.log existiert UND i===MAX_FILES → loeschen)
       * i=2: app.1.log → app.2.log
       * i=1: app.log   → app.1.log
       */
      for (let i = MAX_FILES; i >= 1; i--) {
        const from = path.join(
          this.logDir,
          i === 1 ? 'app.log' : `app.${i - 1}.log`,
        );
        const to = path.join(this.logDir, `app.${i}.log`);
        if (fs.existsSync(from)) {
          // Aelteste Datei loeschen, wenn sie ueber dem Limit liegt
          if (i === MAX_FILES && fs.existsSync(to)) fs.unlinkSync(to);
          try {
            // renameSync = Datei umbenennen (atomar auf den meisten Dateisystemen)
            fs.renameSync(from, to);
          } catch {
            /* race-safe: Wenn zwei Prozesse gleichzeitig rotieren, kann ein rename fehlschlagen */
          }
        }
      }

      // Neuen Stream fuer die jetzt leere app.log oeffnen
      this.stream = fs.createWriteStream(this.logPath, { flags: 'a' });
    } catch {
      // Rotation-Fehler ignorieren — Logging darf die App nicht zum Absturz bringen
    }
  }
}
