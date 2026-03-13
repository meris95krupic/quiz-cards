/**
 * =====================================================================
 * ShopController — REST-Controller für den Kartenlisten-Shop
 * =====================================================================
 *
 * Dieser Controller verwaltet den Shop-Bereich der Anwendung.
 * Besonderheit: NICHT alle Routen sind geschützt!
 *
 * - GET /shop → ÖFFENTLICH (kein JWT nötig) — jeder kann den Shop durchstöbern
 * - Alle anderen Routen → Geschützt per @UseGuards(JwtAuthGuard)
 *
 * Beachte den Unterschied zum CardListsController, wo @UseGuards auf
 * KLASSEN-Ebene steht (= alle Routen geschützt). Hier wird der Guard
 * auf METHODEN-Ebene angewendet, was feinere Kontrolle ermöglicht.
 *
 * Admin-Prüfung: Wird im Service gemacht (nicht per Guard), weil die
 * Admin-Logik einfach ist (E-Mail-Vergleich mit ADMIN_EMAIL env var).
 */

import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { ShopService } from './shop.service';

@ApiTags('shop')
@Controller('shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  /**
   * GET /shop — Alle genehmigten Shop-Einträge abrufen.
   *
   * ÖFFENTLICH: Kein @UseGuards → kein JWT-Token nötig.
   * Jeder (auch nicht eingeloggte User) kann den Shop durchstöbern.
   */
  @Get()
  @ApiOperation({ summary: 'Get all approved shop listings' })
  findApproved() {
    return this.shopService.findApproved();
  }

  /**
   * GET /shop/pending — Alle noch nicht geprüften Einreichungen.
   *
   * @UseGuards(JwtAuthGuard) auf METHODEN-Ebene → nur diese Route ist geschützt.
   * @ApiBearerAuth() → Swagger zeigt das Schloss-Symbol für diese Route.
   *
   * Die Admin-Prüfung passiert im Service (shopService.findPending prüft
   * isAdmin und wirft ForbiddenException bei Nicht-Admins).
   */
  @Get('pending')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending submissions (admin only)' })
  findPending(@CurrentUser() user: User) {
    return this.shopService.findPending(user);
  }

  /**
   * POST /shop/submit/:listId — Eine eigene Kartenliste zum Shop einreichen.
   *
   * Der User gibt die ID seiner Kartenliste an, die er öffentlich teilen möchte.
   * ParseUUIDPipe stellt sicher, dass die listId ein gültiges UUID-Format hat.
   */
  @Post('submit/:listId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a card list to the shop' })
  submit(
    @Param('listId', ParseUUIDPipe) listId: string,
    @CurrentUser() user: User,
  ) {
    return this.shopService.submit(listId, user);
  }

  /**
   * POST /shop/:id/approve — Eine Einreichung genehmigen (nur Admin).
   *
   * ":id" ist hier die ID der ShopSubmission (nicht der CardList).
   * Der Admin-Check passiert im Service.
   */
  @Post(':id/approve')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a submission (admin only)' })
  approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.shopService.approve(id, user);
  }

  /**
   * POST /shop/:id/reject — Eine Einreichung ablehnen (nur Admin).
   *
   * @HttpCode(HttpStatus.OK) → Explizit Status 200.
   * POST-Requests geben standardmäßig 201 (Created) zurück, aber hier
   * wird nichts "erstellt", sondern nur ein Status geändert → 200 passt besser.
   */
  @Post(':id/reject')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a submission (admin only)' })
  @HttpCode(HttpStatus.OK)
  reject(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.shopService.reject(id, user);
  }

  /**
   * POST /shop/:id/import — Eine genehmigte Shop-Liste in die eigene Sammlung kopieren.
   *
   * Erstellt eine KOMPLETTE KOPIE der Kartenliste + aller Karten.
   * Die Kopie gehört dann dem eingeloggten User (neue userId).
   */
  @Post(':id/import')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Import an approved shop list to your lists' })
  importToMyLists(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.shopService.importToMyLists(id, user);
  }

  /**
   * DELETE /shop/:id — Eigene Einreichung löschen (oder jede, als Admin).
   *
   * @HttpCode(HttpStatus.NO_CONTENT) → 204, kein Response-Body.
   * Im Service wird geprüft: Ist der User der Ersteller ODER ein Admin?
   * Falls nein → ForbiddenException (403).
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete own submission (or any, if admin)' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.shopService.remove(id, user);
  }
}
