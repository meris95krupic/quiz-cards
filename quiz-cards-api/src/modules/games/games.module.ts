/**
 * ============================================================================
 * GAMES MODULE — Das NestJS-Modul für die gesamte Spiel-Logik
 * ============================================================================
 *
 * In NestJS ist ein "Module" die zentrale Organisationseinheit. Jedes Feature
 * der App bekommt sein eigenes Modul. Ein Modul bündelt zusammengehörige
 * Controller, Services und Entities.
 *
 * Stell dir ein Modul wie einen Ordner vor, der NestJS sagt:
 * "Hier sind alle Bausteine, die zum Feature 'Games' gehören."
 *
 * Der @Module()-Dekorator hat drei wichtige Felder:
 *   - imports:      Andere Module, die dieses Modul braucht (z.B. Datenbank-Repos)
 *   - providers:    Services (Geschäftslogik), die NestJS per Dependency Injection bereitstellt
 *   - controllers:  HTTP-Endpunkte, die Anfragen entgegennehmen
 *
 * Dieses Modul wird dann in app.module.ts importiert, damit NestJS es kennt.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { Game } from './game.entity';
import { GamePlayer } from './game-player.entity';
import { GameTurn } from './game-turn.entity';
import { CardList } from '../card-lists/card-list.entity';
import { Card } from '../cards/card.entity';
import { CardProgress } from '../cards/card-progress.entity';

/**
 * @Module() — Der Dekorator, der diese Klasse als NestJS-Modul markiert.
 *
 * TypeOrmModule.forFeature([...]) registriert Repositories für die angegebenen
 * Entities. Dadurch kann der GamesService z.B. @InjectRepository(Game) nutzen,
 * um direkt auf die Datenbank-Tabelle "games" zuzugreifen.
 *
 * Ohne forFeature() würde NestJS beim Start einen Fehler werfen:
 * "Nest can't resolve dependencies of GamesService (?, ...)"
 *
 * Wir registrieren hier ALLE Entities, die der GamesService braucht:
 *   - Game, GamePlayer, GameTurn  → Die eigenen Spiel-Tabellen
 *   - CardList, Card              → Zugriff auf Kartenlisten und Karten
 *   - CardProgress                → Lernfortschritt pro Nutzer pro Karte
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Game,
      GamePlayer,
      GameTurn,
      CardList,
      Card,
      CardProgress,
    ]),
  ],

  /**
   * providers: Services, die NestJS automatisch instanziiert und per
   * Dependency Injection (DI) in Controller oder andere Services einsetzt.
   *
   * NestJS erstellt EINE Instanz von GamesService (Singleton-Pattern)
   * und gibt sie überall dort rein, wo sie angefordert wird.
   */
  providers: [GamesService],

  /**
   * controllers: Die HTTP-Schnittstellen. NestJS erstellt automatisch
   * die Routes basierend auf den Dekoratoren im Controller.
   */
  controllers: [GamesController],
})
export class GamesModule {}
