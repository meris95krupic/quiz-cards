/**
 * =====================================================================
 * CardListsModule — NestJS-Moduldefinition für Kartenlisten
 * =====================================================================
 *
 * In NestJS ist ein "Module" die grundlegende Organisationseinheit.
 * Jede Funktionalität (z.B. Kartenlisten, User, Auth) bekommt ihr eigenes Modul.
 *
 * Ein Modul bündelt zusammengehörige Teile:
 *   - Controller  → empfangen HTTP-Anfragen (REST-Endpunkte)
 *   - Services    → enthalten die Geschäftslogik (Business Logic)
 *   - Entities    → TypeORM-Datenbank-Tabellen, die dieses Modul nutzt
 *
 * Das @Module()-Dekorator teilt NestJS mit, wie dieses Modul aufgebaut ist.
 */

// Module: Basis-Dekorator von NestJS, um eine Klasse als Modul zu markieren
import { Module } from '@nestjs/common';

// TypeOrmModule: Bindet TypeORM (das ORM für Datenbankzugriffe) in NestJS ein.
// Die Methode .forFeature() registriert Entities, damit sie per Dependency Injection
// als Repositories in Services injiziert werden können.
import { TypeOrmModule } from '@nestjs/typeorm';

// Lokale Imports: Service, Controller und Entities dieses Moduls
import { CardListsService } from './card-lists.service';
import { CardListsController } from './card-lists.controller';
import { CardList } from './card-list.entity';
import { Card } from '../cards/card.entity';

/**
 * @Module() — Der zentrale Dekorator, der diese Klasse als NestJS-Modul definiert.
 *
 * Eigenschaften:
 *
 * - imports: Andere Module, die dieses Modul braucht.
 *   → TypeOrmModule.forFeature([CardList, Card]) registriert die Repositories
 *     für die Entities CardList und Card. Dadurch kann der Service per
 *     @InjectRepository(CardList) auf die Datenbank-Tabelle zugreifen.
 *
 * - providers: Klassen, die NestJS per Dependency Injection bereitstellt.
 *   → CardListsService wird hier als Provider registriert, damit NestJS
 *     automatisch eine Instanz erstellt und sie z.B. in den Controller injiziert.
 *
 * - controllers: Die REST-Controller, die HTTP-Routen definieren.
 *   → CardListsController wird registriert und behandelt alle /card-lists Routen.
 *
 * - exports: Providers, die auch von ANDEREN Modulen genutzt werden dürfen.
 *   → CardListsService wird exportiert, damit z.B. das ShopModule oder GamesModule
 *     den Service importieren und nutzen können (Modul-übergreifende Nutzung).
 */
@Module({
  imports: [TypeOrmModule.forFeature([CardList, Card])],
  providers: [CardListsService],
  controllers: [CardListsController],
  exports: [CardListsService],
})
export class CardListsModule {}
