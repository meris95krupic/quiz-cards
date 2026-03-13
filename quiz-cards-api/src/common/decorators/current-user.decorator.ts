/**
 * ============================================================================
 * CURRENT USER DECORATOR (Eigener Parameter-Decorator)
 * ============================================================================
 *
 * NestJS Request-Lifecycle:
 *   Middleware → Guard → Interceptor → **Pipe** → **Route-Handler** → ...
 *
 * Decorators sind ein TypeScript/NestJS-Konzept (mit dem @-Zeichen).
 * Es gibt verschiedene Arten:
 * - Klassen-Decorators: @Controller(), @Injectable(), @Module()
 * - Methoden-Decorators: @Get(), @Post(), @UseGuards()
 * - Parameter-Decorators: @Body(), @Param(), @Query(), @CurrentUser()  ← DAS HIER!
 *
 * Was macht dieser Custom Decorator?
 * -----------------------------------
 * Wenn ein User eingeloggt ist (JWT-Guard hat den Token verifiziert),
 * speichert Passport die User-Daten in request.user.
 *
 * OHNE diesen Decorator muesste man in jedem Controller-Handler schreiben:
 *
 *   @Get('me')
 *   getProfile(@Req() req: Request) {
 *     const user = req.user;  // <-- umstaendlich und nicht typsicher
 *     return user;
 *   }
 *
 * MIT diesem Decorator schreibt man einfach:
 *
 *   @Get('me')
 *   getProfile(@CurrentUser() user: User) {  // <-- sauber und typsicher!
 *     return user;
 *   }
 *
 * Vorteile:
 * - Weniger Boilerplate-Code
 * - Typsicherheit: TypeScript weiss, dass "user" vom Typ "User" ist
 * - Wiederverwendbar: In jedem Controller nutzbar
 * - Testbar: Einfacher zu mocken in Unit-Tests
 * ============================================================================
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { User } from '../../modules/users/user.entity';

/**
 * createParamDecorator() — NestJS-Hilfsfunktion zum Erstellen eigener Parameter-Decorators.
 *
 * Parameter-Decorators extrahieren Werte aus dem Request und injizieren sie
 * als Funktionsparameter in den Route-Handler.
 *
 * Eingebaute Beispiele: @Body() → request.body, @Param('id') → request.params.id
 * Unser Custom: @CurrentUser() → request.user (vom JWT-Guard gesetzt)
 *
 * Die Callback-Funktion bekommt zwei Argumente:
 *
 * @param _data  - Optionaler Wert, der dem Decorator uebergeben wird.
 *                 Beispiel: @CurrentUser('email') → _data wuerde 'email' sein.
 *                 Wir brauchen das nicht, daher "_data" (Unterstrich = bewusst unbenutzt).
 *
 * @param ctx    - ExecutionContext: Zugriff auf den aktuellen Request (wie bei Guards/Interceptors).
 *                 Mit ctx.switchToHttp().getRequest() holen wir das Express-Request-Objekt.
 *
 * @returns User - Das User-Objekt, das Passport nach erfolgreicher JWT-Validierung
 *                 an request.user angehaengt hat. Dieses Objekt kommt aus der
 *                 validate()-Methode der JwtStrategy (in auth/jwt.strategy.ts).
 *
 * WICHTIG: Dieser Decorator funktioniert nur, wenn der JwtAuthGuard VORHER
 * ausgefuehrt wurde! Ohne Guard ist request.user undefined → Fehler.
 * Deshalb immer zusammen verwenden:
 *
 *   @UseGuards(JwtAuthGuard)
 *   @Get('me')
 *   getProfile(@CurrentUser() user: User) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => {
    // switchToHttp() → HTTP-Kontext (wie bei Filter und Interceptor)
    // getRequest<Request & { user: User }>() → Express-Request mit typisiertem user-Feld
    // Das "& { user: User }" ist eine TypeScript Intersection-Type:
    // "Ein Request-Objekt, das ZUSAETZLICH ein user-Feld vom Typ User hat"
    const request = ctx.switchToHttp().getRequest<Request & { user: User }>();
    return request.user;
  },
);
