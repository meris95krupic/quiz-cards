/**
 * =====================================================================
 * CardListsService — Geschäftslogik für Kartenlisten
 * =====================================================================
 *
 * Ein Service in NestJS enthält die gesamte Geschäftslogik (Business Logic).
 * Der Controller ruft den Service auf, und der Service erledigt die Arbeit:
 *   - Datenbankabfragen über TypeORM-Repositories
 *   - Validierungen und Fehlerbehandlung
 *   - Transaktionen (mehrere DB-Operationen atomar ausführen)
 *
 * Der @Injectable()-Dekorator markiert die Klasse als "Provider", damit NestJS
 * sie per Dependency Injection bereitstellen kann.
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

// @InjectRepository: Dekorator, der ein TypeORM-Repository per DI injiziert
import { InjectRepository } from '@nestjs/typeorm';

// DataSource: Die zentrale TypeORM-Verbindung zur Datenbank.
// Repository: TypeORM-Klasse, die CRUD-Operationen für eine Entity bereitstellt.
import { DataSource, Repository } from 'typeorm';

import { CardList } from './card-list.entity';
import { Card, CardType } from '../cards/card.entity';
import { ImportCardListDto } from './dto/import-card-list.dto';

/**
 * @Injectable() — Markiert diese Klasse als NestJS-Provider.
 *
 * Dadurch kann NestJS automatisch Instanzen erstellen und sie in andere
 * Klassen (Controller, andere Services) injizieren. Ohne @Injectable()
 * würde die Dependency Injection nicht funktionieren.
 */
@Injectable()
export class CardListsService {
  constructor(
    /**
     * @InjectRepository(CardList) — Injiziert das TypeORM-Repository für CardList.
     *
     * Ein Repository ist wie ein "Datenzugangs-Objekt" (DAO) für eine bestimmte
     * Datenbank-Tabelle. Es bietet Methoden wie:
     *   - find() / findOne()  → SELECT-Abfragen
     *   - save()              → INSERT oder UPDATE
     *   - delete()            → DELETE
     *   - create()            → Erstellt eine Entity-Instanz (noch nicht in der DB!)
     *
     * Wichtig: Repository<CardList> ist generisch typisiert — TypeScript weiß
     * dadurch, welche Felder die Entity hat (Autovervollständigung!).
     */
    @InjectRepository(CardList)
    private readonly cardListRepo: Repository<CardList>,

    /**
     * DataSource — Die zentrale Datenbankverbindung von TypeORM.
     *
     * Wird hier für Transaktionen benötigt (this.dataSource.transaction()).
     * Eine Transaktion stellt sicher, dass ALLE Datenbankoperationen innerhalb
     * entweder komplett erfolgreich sind oder komplett rückgängig gemacht werden.
     *
     * NestJS injiziert die DataSource automatisch (kein @InjectRepository nötig,
     * weil DataSource kein Repository ist, sondern ein globaler TypeORM-Provider).
     */
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Alle Kartenlisten eines bestimmten Users abrufen.
   *
   * this.cardListRepo.find() → Entspricht einem SQL:
   *   SELECT * FROM card_lists WHERE user_id = :userId
   *   + JOIN auf cards (wegen relations: ['cards'])
   *
   * Parameter:
   * - where: { userId } → Filtert nach dem eingeloggten User
   * - relations: ['cards'] → Lädt die verknüpften Karten gleich mit (Eager Loading).
   *   Ohne "relations" wären list.cards undefined, weil TypeORM standardmäßig
   *   keine Relationen lädt (Lazy Loading ist Standard).
   * - order: Sortiert Listen nach Erstellungsdatum (neueste zuerst),
   *   und Karten innerhalb einer Liste nach Position (aufsteigend).
   *   "as never" ist ein TypeScript-Workaround für verschachtelte Sortierung.
   */
  findAll(userId: string): Promise<CardList[]> {
    return this.cardListRepo.find({
      where: { userId },
      relations: ['cards'],
      order: { createdAt: 'DESC', cards: { position: 'ASC' } } as never,
    });
  }

  /**
   * Eine einzelne Kartenliste per ID laden (inklusive aller Karten).
   *
   * findOne() gibt entweder die Entity oder null zurück.
   * Falls null → NotFoundException (HTTP 404) werfen.
   *
   * NestJS fängt Exceptions automatisch ab und wandelt sie in HTTP-Responses um:
   *   - NotFoundException → 404 Not Found
   *   - BadRequestException → 400 Bad Request
   *   - ForbiddenException → 403 Forbidden
   *   usw.
   */
  async findOne(id: string): Promise<CardList> {
    const list = await this.cardListRepo.findOne({
      where: { id },
      relations: ['cards'],
      order: { cards: { position: 'ASC' } } as never,
    });
    if (!list) throw new NotFoundException(`Card list ${id} not found`);
    return list;
  }

  /**
   * Importiert eine komplette Kartenliste aus einem DTO (JSON-Body).
   *
   * Verwendet eine TRANSAKTION, damit entweder ALLE Datenbankoperationen
   * erfolgreich sind (Liste + alle Karten gespeichert) oder KEINE
   * (bei einem Fehler wird alles rückgängig gemacht — "Rollback").
   *
   * Ohne Transaktion könnte es passieren, dass die Liste gespeichert wird,
   * aber eine Karte fehlschlägt — dann hätte man eine Liste ohne Karten.
   *
   * this.dataSource.transaction(async (manager) => { ... })
   *   - "manager" ist ein EntityManager, der alle DB-Operationen innerhalb
   *     der Transaktion ausführt. Wichtig: NICHT this.cardListRepo verwenden,
   *     sondern immer "manager", damit alles in derselben Transaktion läuft!
   */
  async import(dto: ImportCardListDto, userId: string): Promise<CardList> {
    return this.dataSource.transaction(async (manager) => {
      /**
       * manager.create() — Erstellt eine Entity-Instanz im Speicher.
       *   Achtung: Die Entity ist noch NICHT in der Datenbank!
       *   Erst manager.save() schreibt sie in die DB und generiert die UUID.
       */
      const list = manager.create(CardList, {
        userId,
        title: dto.title,
        description: dto.description ?? null,
        bgColor: dto.bgColor ?? null,
      });
      await manager.save(list);

      /**
       * Karten aus dem DTO erstellen und validieren.
       *
       * Für Multiple-Choice-Karten wird geprüft:
       *   1. Sind "options" und "correctIndex" vorhanden?
       *   2. Liegt correctIndex innerhalb des options-Arrays?
       *
       * Bei Validierungsfehlern → BadRequestException (HTTP 400).
       * Da wir in einer Transaktion sind, wird auch die bereits gespeicherte
       * Liste automatisch rückgängig gemacht (Rollback).
       *
       * dto.cards.map((c, idx) => ...) wandelt jedes DTO-Karten-Objekt
       * in eine Card-Entity um. "idx" wird als Position verwendet.
       */
      const cards = dto.cards.map((c, idx) => {
        if (c.type === CardType.MULTIPLE_CHOICE) {
          if (!c.options || c.correctIndex === undefined) {
            throw new BadRequestException(
              `Card at index ${idx}: multiple_choice requires options and correctIndex`,
            );
          }
          if (c.correctIndex >= c.options.length) {
            throw new BadRequestException(
              `Card at index ${idx}: correctIndex out of range`,
            );
          }
        }
        return manager.create(Card, {
          cardListId: list.id, // Fremdschlüssel: verknüpft Karte mit der Liste
          type: c.type,
          front: c.front,
          back: c.back,
          options: c.options ?? null, // null falls nicht Multiple Choice
          correctIndex: c.correctIndex ?? null,
          position: idx, // Reihenfolge der Karten
          bgColor: c.bgColor ?? null,
        });
      });

      // Alle Karten auf einmal speichern (Batch-Insert)
      await manager.save(cards);

      // Karten an die Liste anhängen, damit die Antwort vollständig ist
      list.cards = cards;
      return list;
    });
  }

  /**
   * Kartenliste löschen.
   *
   * this.cardListRepo.delete(id) → Löscht die Zeile mit dieser ID.
   *   Dank CASCADE in der Datenbank werden auch alle zugehörigen Karten
   *   automatisch mitgelöscht.
   *
   * result.affected → Anzahl der gelöschten Zeilen.
   *   Falls 0 → Die ID existierte nicht → NotFoundException (HTTP 404).
   */
  async remove(id: string): Promise<void> {
    const result = await this.cardListRepo.delete(id);
    if (result.affected === 0)
      throw new NotFoundException(`Card list ${id} not found`);
  }
}
