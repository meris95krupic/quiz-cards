/**
 * =====================================================================
 * ShopModule — NestJS-Modul für den Kartenlisten-Shop
 * =====================================================================
 *
 * Der Shop ermöglicht es Usern, ihre Kartenlisten öffentlich zu teilen.
 * Andere User können diese Listen dann in ihre eigene Sammlung importieren.
 *
 * Ablauf (Shop Submission Flow):
 * 1. User reicht eine Kartenliste ein (submit) → Status: "pending"
 * 2. Admin prüft die Einreichung → "approved" oder "rejected"
 *    (Admins werden automatisch approved — kein Warten nötig)
 * 3. Genehmigte Listen erscheinen im Shop (findApproved)
 * 4. Andere User können genehmigte Listen importieren (importToMyLists)
 *    → Dabei wird eine KOPIE der Liste + Karten erstellt
 *
 * Dieses Modul braucht drei Entities:
 * - ShopSubmission: Die Einreichung selbst (Status, wer hat eingereicht, etc.)
 * - CardList: Um die originale Kartenliste zu lesen
 * - Card: Um beim Import die Karten zu kopieren
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShopSubmission } from './shop-submission.entity';
import { CardList } from '../card-lists/card-list.entity';
import { Card } from '../cards/card.entity';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';

/**
 * TypeOrmModule.forFeature([ShopSubmission, CardList, Card])
 *   → Registriert Repositories für DREI Entities in diesem Modul.
 *   Der ShopService kann dadurch per @InjectRepository() auf alle drei
 *   Datenbank-Tabellen zugreifen.
 *
 * Hinweis: CardList und Card werden auch im CardListsModule registriert —
 * das ist in NestJS erlaubt und normal. Jedes Modul registriert die
 * Entities, die es braucht, unabhängig von anderen Modulen.
 */
@Module({
  imports: [TypeOrmModule.forFeature([ShopSubmission, CardList, Card])],
  controllers: [ShopController],
  providers: [ShopService],
})
export class ShopModule {}
