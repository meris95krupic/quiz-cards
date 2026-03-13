/**
 * ============================================================================
 * LOGGING INTERCEPTOR (Request-Logging-Abfangjaeger)
 * ============================================================================
 *
 * NestJS Request-Lifecycle:
 *   Middleware → Guard → **INTERCEPTOR (vorher)** → Pipe → Route-Handler
 *   → **INTERCEPTOR (nachher)** → Exception-Filter
 *
 * Ein "Interceptor" in NestJS kann Code VOR und NACH dem Route-Handler ausfuehren.
 * Das Besondere: Er umschliesst den Handler wie eine Zwiebel (Aspektorientierte Programmierung / AOP).
 *
 * Interceptors koennen:
 * - Die Anfrage VOR dem Handler manipulieren (z.B. Daten transformieren)
 * - Die Antwort NACH dem Handler manipulieren (z.B. Daten wrappen, cachen)
 * - Die Ausfuehrungszeit messen (wie dieser Interceptor hier!)
 * - Exceptions abfangen und in andere Fehler umwandeln
 * - Den Handler komplett ueberspringen (z.B. fuer Caching)
 *
 * Dieser Interceptor misst, wie lange jeder API-Request dauert,
 * und loggt das Ergebnis: "GET /api/games → 42ms"
 *
 * Das ist super nuetzlich fuer:
 * - Performance-Monitoring: Welche Endpoints sind langsam?
 * - Debugging: Wann wurde welcher Request verarbeitet?
 * - Produktions-Ueberwachung: Ungewoehnlich langsame Requests erkennen
 * ============================================================================
 */

import {
  Injectable, // Markiert die Klasse fuer Dependency Injection
  NestInterceptor, // Interface, das ein Interceptor implementieren muss
  ExecutionContext, // Erweiterter Kontext (wie ArgumentsHost, aber mit mehr Infos)
  CallHandler, // Repraesentiert den naechsten Handler in der Kette (den Route-Handler)
  Logger, // NestJS eingebauter Logger
} from '@nestjs/common';
import { Observable } from 'rxjs'; // RxJS Observable — NestJS nutzt Reactive Extensions intern
import { tap } from 'rxjs/operators'; // RxJS "tap" Operator — fuehrt Seiteneffekte aus, ohne den Wert zu aendern
import { Request } from 'express';

/**
 * @Injectable() — Noetig fuer Dependency Injection (siehe Guard-Erklaerung).
 *
 * "implements NestInterceptor" — Zwingt uns, die intercept()-Methode zu implementieren.
 * TypeScript-Interfaces sind wie Vertraege: "Diese Klasse MUSS diese Methoden haben."
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  /**
   * Logger mit dem Kontext-String 'HTTP'.
   * In den Logs steht dann: [HTTP] GET /api/games → 42ms
   * So kann man HTTP-Logs schnell von anderen Logs unterscheiden.
   */
  private readonly logger = new Logger('HTTP');

  /**
   * intercept() — Die Hauptmethode, die NestJS fuer JEDEN Request aufruft.
   *
   * @param context - ExecutionContext: Gibt Zugriff auf den aktuellen Request,
   *                  den Controller, die Handler-Methode, etc.
   *                  Erweitert ArgumentsHost um Methoden wie getClass(), getHandler().
   *
   * @param next    - CallHandler: Repraesentiert den naechsten Schritt in der Pipeline.
   *                  next.handle() ruft den eigentlichen Route-Handler auf.
   *                  WICHTIG: Wenn man next.handle() NICHT aufruft, wird der Handler
   *                  nie ausgefuehrt — der Request bleibt haengen!
   *
   * @returns Observable<unknown> — NestJS arbeitet intern mit RxJS Observables.
   *          Ein Observable ist wie ein Promise, aber kann mehrere Werte ueber Zeit liefern.
   *          Fuer HTTP-Requests liefert es genau EINEN Wert: die Antwort des Handlers.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Request-Objekt aus dem HTTP-Kontext holen (gleich wie beim Filter)
    const req = context.switchToHttp().getRequest<Request>();

    // Destructuring: method = "GET"/"POST"/etc., url = "/api/games/123"
    const { method, url } = req;

    // Startzeit merken (Millisekunden seit 1.1.1970)
    const now = Date.now();

    /**
     * next.handle() — Ruft den eigentlichen Route-Handler auf.
     *
     * .pipe() — RxJS-Methode zum Verketten von Operatoren.
     *           Operatoren transformieren den Datenstrom, BEVOR er zurueckgegeben wird.
     *
     * tap() — RxJS "Seiteneffekt"-Operator:
     *         - Fuehrt eine Funktion aus, OHNE den Wert zu veraendern
     *         - Perfekt fuer Logging, weil wir die Antwort nicht aendern wollen
     *         - Wird erst ausgefuehrt, NACHDEM der Handler fertig ist
     *
     * Ablauf:
     * 1. now = Date.now()                    → Startzeit speichern
     * 2. next.handle()                       → Route-Handler ausfuehren (z.B. GamesController.getState())
     * 3. tap(() => ...)                      → NACH dem Handler: Dauer berechnen und loggen
     * 4. Date.now() - now                    → Differenz = Dauer in Millisekunden
     *
     * Beispiel-Output: [HTTP] GET /api/games/abc-123/state → 12ms
     */
    return next
      .handle()
      .pipe(
        tap(() => this.logger.log(`${method} ${url} → ${Date.now() - now}ms`)),
      );
  }
}
