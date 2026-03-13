/**
 * ============================================================================
 * ALL-EXCEPTIONS FILTER (Globaler Exception-Filter)
 * ============================================================================
 *
 * NestJS Request-Lifecycle (die Reihenfolge, in der eine Anfrage verarbeitet wird):
 *
 *   Middleware → Guard → Interceptor (vorher) → Pipe → Route-Handler
 *   → Interceptor (nachher) → Exception-Filter (bei Fehlern)
 *
 * Ein "Filter" in NestJS faengt Exceptions (Fehler) ab, die waehrend der
 * Verarbeitung einer Anfrage geworfen werden. Ohne Filter wuerde NestJS
 * bei unbekannten Fehlern einfach eine haessliche Standard-Antwort senden.
 *
 * Dieser Filter hier ist ein GLOBALER Filter — er faengt ALLE Exceptions ab,
 * egal ob es ein bekannter HttpException ist (z.B. 404 Not Found) oder ein
 * unerwarteter Fehler (z.B. Datenbank-Verbindung verloren → 500).
 *
 * Warum braucht man das?
 * - Einheitliches Fehler-Format fuer ALLE API-Antworten (Frontend kann sich drauf verlassen)
 * - Logging: Jeder Fehler wird mit Request-Details protokolliert
 * - Sicherheit: Bei unbekannten Fehlern wird nur "Internal server error" zurueckgegeben,
 *   nicht der echte Fehlertext (der koennte sensible Infos enthalten)
 * ============================================================================
 */

import {
  ExceptionFilter, // Interface, das ein Exception-Filter implementieren muss
  Catch, // Decorator: legt fest, welche Exceptions dieser Filter abfaengt
  ArgumentsHost, // Hilfsklasse, um auf den Request/Response-Kontext zuzugreifen
  HttpException, // NestJS-Basisklasse fuer HTTP-Fehler (400, 401, 404, etc.)
  HttpStatus, // Enum mit allen HTTP-Statuscodes (z.B. HttpStatus.NOT_FOUND = 404)
  Logger, // NestJS eingebauter Logger (schreibt formatierte Logs in die Konsole)
} from '@nestjs/common';
import { Request, Response } from 'express'; // Express-Typen fuer typsichere Zugriffe

/**
 * @Catch() — Decorator OHNE Argument = faengt ALLE Exceptions ab.
 *
 * Man koennte auch @Catch(HttpException) schreiben, dann wuerden nur HttpExceptions
 * abgefangen. Ohne Argument faengt er ALLES — auch TypeError, DB-Fehler, etc.
 *
 * "implements ExceptionFilter" — NestJS verlangt, dass die Klasse eine catch()-Methode hat.
 * Das Interface sorgt dafuer, dass TypeScript einen Fehler zeigt, wenn die Methode fehlt.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  /**
   * NestJS Logger-Instanz mit dem Klassennamen als "Context".
   * In den Logs sieht man dann z.B.: [AllExceptionsFilter] POST /api/games → 500
   * "private readonly" = kann nur innerhalb dieser Klasse gelesen werden, nie veraendert.
   */
  private readonly logger = new Logger(AllExceptionsFilter.name);

  /**
   * catch() — Die Hauptmethode, die NestJS aufruft, wenn eine Exception fliegt.
   *
   * @param exception - Der geworfene Fehler (kann ALLES sein: HttpException, Error, string, etc.)
   * @param host      - "ArgumentsHost" gibt Zugriff auf den Ausfuehrungskontext.
   *                    NestJS unterstuetzt HTTP, WebSockets und Microservices —
   *                    mit host.switchToHttp() sagen wir: "Wir arbeiten im HTTP-Kontext".
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    // switchToHttp() → gibt uns den HTTP-spezifischen Kontext (Request + Response)
    const ctx = host.switchToHttp();
    // getResponse<Response>() → das Express-Response-Objekt, mit dem wir die Antwort senden
    const response = ctx.getResponse<Response>();
    // getRequest<Request>() → das Express-Request-Objekt (URL, Method, Body, etc.)
    const request = ctx.getRequest<Request>();

    /**
     * HTTP-Statuscode bestimmen:
     * - Ist es ein HttpException (z.B. throw new NotFoundException())?
     *   → Statuscode aus der Exception nehmen (z.B. 404)
     * - Ist es ein unbekannter Fehler (z.B. TypeError, DB-Fehler)?
     *   → Sicherheitshalber 500 (Internal Server Error) zurueckgeben
     *
     * "instanceof" prueft, ob ein Objekt eine Instanz einer bestimmten Klasse ist.
     * Das ist der Ternary-Operator: bedingung ? wennJa : wennNein
     */
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    /**
     * Fehlermeldung bestimmen:
     * - HttpException: getResponse() liefert die Nachricht (kann string oder Objekt sein)
     * - Unbekannter Fehler: generische Nachricht, damit keine internen Details leaken
     */
    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    /**
     * Logging fuer ALLE Fehler (Status >= 400):
     * - 4xx = Client-Fehler (z.B. 400 Bad Request, 401 Unauthorized, 404 Not Found)
     * - 5xx = Server-Fehler (z.B. 500 Internal Server Error)
     *
     * Der Request-Body wird mitgeloggt, damit man beim Debugging sehen kann,
     * welche Daten der Client gesendet hat (z.B. fehlende Felder).
     */
    if (status >= 400) {
      const body = request.body as Record<string, unknown> | undefined;
      // Nur den Body loggen, wenn er nicht leer ist
      const detail =
        body && Object.keys(body).length > 0
          ? ` body=${JSON.stringify(body)}`
          : '';
      // logger.error() nimmt (message, stackTrace) — der Stack-Trace hilft beim Debugging
      this.logger.error(
        `${request.method} ${request.url} → ${status}${detail}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    /**
     * Einheitliche JSON-Antwort an den Client senden.
     * Jeder Fehler hat das gleiche Format — das macht es dem Frontend einfach,
     * Fehler zu verarbeiten (es weiss immer, wie die Antwort aussieht).
     *
     * response.status(status) → setzt den HTTP-Statuscode
     * .json({...})            → sendet das Objekt als JSON-Body
     */
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
