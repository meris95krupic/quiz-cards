/**
 * =====================================================================
 * UsersController — REST-Controller für die Benutzerverwaltung
 * =====================================================================
 *
 * Stellt CRUD-Endpunkte (Create, Read, Update, Delete) für User bereit.
 * Alle Routen sind per JWT geschützt (@UseGuards auf Klassen-Ebene).
 *
 * Verfügbare Endpunkte:
 *   GET    /users       → Alle User auflisten
 *   GET    /users/:id   → Einen User per ID abrufen
 *   PATCH  /users/:id   → Name/Avatar eines Users aktualisieren
 *   DELETE /users/:id   → Einen User löschen
 *
 * Hinweis: "Create" (POST) fehlt hier, weil neue User über den
 * AuthController (POST /auth/register) erstellt werden.
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  // Patch: HTTP-Methode für TEILWEISE Updates (im Gegensatz zu PUT = komplett ersetzen)
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

/**
 * @ApiTags('users') → Swagger-Gruppierung
 * @ApiBearerAuth() → Swagger: Bearer-Token für alle Routen benötigt
 * @UseGuards(JwtAuthGuard) → ALLE Routen in diesem Controller sind JWT-geschützt
 * @Controller('users') → Basis-URL: /users
 */
@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  /**
   * Dependency Injection: NestJS übergibt automatisch eine UsersService-Instanz.
   * "private readonly" → kann nur intern gelesen, nicht verändert werden.
   */
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /users — Alle registrierten User auflisten.
   *
   * Gibt eine Liste von User-Objekten OHNE passwordHash zurück
   * (der Service filtert das sensible Feld heraus).
   */
  @Get()
  @ApiOperation({ summary: 'List all registered users' })
  findAll() {
    return this.usersService.findAll();
  }

  /**
   * GET /users/:id — Einen einzelnen User per UUID abrufen.
   *
   * @Param('id', ParseUUIDPipe) → Extrahiert ":id" aus der URL und
   * validiert, dass es ein gültiges UUID-Format ist (z.B. 550e8400-...).
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  /**
   * PATCH /users/:id — Name oder Avatar eines Users aktualisieren.
   *
   * PATCH vs. PUT:
   * - PATCH: Nur die mitgeschickten Felder werden geändert (teilweises Update)
   * - PUT: Das gesamte Objekt wird ersetzt (alle Felder müssen mitgeschickt werden)
   *
   * @Body() dto: UpdateUserDto → Der Request-Body wird automatisch gegen
   * die UpdateUserDto-Klasse validiert. Da beide Felder @IsOptional() sind,
   * kann man nur name, nur avatarId oder beides gleichzeitig ändern.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update name or avatar' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  /**
   * DELETE /users/:id — Einen User löschen.
   *
   * @HttpCode(HttpStatus.NO_CONTENT) → Status 204: Erfolgreich gelöscht, kein Body.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a user' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }
}
