/**
 * =====================================================================
 * UsersService — Geschäftslogik für die Benutzerverwaltung
 * =====================================================================
 *
 * Dieser Service implementiert CRUD-Operationen für User.
 *
 * Wichtiges Sicherheitskonzept: Das passwordHash-Feld wird NIEMALS
 * an den Client zurückgegeben. Die Hilfsfunktion stripPassword()
 * entfernt es aus jedem User-Objekt, bevor es als Response gesendet wird.
 *
 * Warum nicht einfach "delete user.passwordHash"?
 *   → Das würde das originale Objekt verändern, was zu unerwarteten
 *   Seiteneffekten führen könnte. Stattdessen wird per Destructuring
 *   ein NEUES Objekt ohne passwordHash erstellt (immutabel/unveränderlich).
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

/**
 * SafeUser — TypeScript-Typ, der alle User-Felder OHNE passwordHash enthält.
 *
 * Omit<User, 'passwordHash'> ist ein TypeScript Utility Type:
 *   "Nimm alle Felder von User, aber OHNE passwordHash."
 *
 * Damit stellt TypeScript sicher, dass wir niemals versehentlich
 * den passwordHash an den Client zurückgeben. Der Compiler würde
 * einen Fehler werfen, falls wir ein User-Objekt MIT passwordHash
 * als SafeUser zurückgeben wollten.
 */
type SafeUser = Omit<User, 'passwordHash'>;

/**
 * Hilfsfunktion: Entfernt passwordHash aus einem User-Objekt.
 *
 * Verwendet JavaScript Destructuring:
 *   const { passwordHash: _pw, ...safe } = user;
 *
 * Das bedeutet:
 *   - passwordHash wird aus "user" extrahiert und in "_pw" gespeichert
 *     (Unterstrich-Präfix = Konvention für "wird absichtlich nicht verwendet")
 *   - ...safe (Spread/Rest-Operator) sammelt ALLE ÜBRIGEN Felder in "safe"
 *
 * Ergebnis: "safe" enthält alles aus "user" AUSSER passwordHash.
 *
 * Der eslint-disable-next-line Kommentar unterdrückt die Warnung,
 * dass _pw nie verwendet wird — das ist hier ja Absicht.
 */
function stripPassword(user: User): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _pw, ...safe } = user;
  return safe;
}

@Injectable()
export class UsersService {
  constructor(
    /**
     * @InjectRepository(User) → Injiziert das TypeORM-Repository für die User-Tabelle.
     *
     * Repository<User> bietet alle Standard-Datenbankoperationen:
     *   .find()    → SELECT * (mit optionalen Filtern)
     *   .findOne() → SELECT ... WHERE ... LIMIT 1
     *   .save()    → INSERT (neue Entity) oder UPDATE (bestehende Entity mit ID)
     *   .delete()  → DELETE WHERE id = ...
     *   .create()  → Entity-Instanz erstellen (NUR im Speicher, nicht in der DB!)
     */
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  /**
   * Alle User abrufen, sortiert nach Erstellungsdatum (älteste zuerst).
   *
   * .find({ order: { createdAt: 'ASC' } }) → SELECT * FROM users ORDER BY created_at ASC
   *
   * .map(stripPassword) → Wendet stripPassword auf JEDEN User im Array an,
   * damit kein passwordHash in der API-Antwort landet.
   */
  async findAll(): Promise<SafeUser[]> {
    const users = await this.userRepo.find({ order: { createdAt: 'ASC' } });
    return users.map(stripPassword);
  }

  /**
   * Einen einzelnen User per ID laden.
   *
   * .findOne({ where: { id } }) → SELECT * FROM users WHERE id = :id LIMIT 1
   *
   * Falls kein User gefunden → NotFoundException (HTTP 404).
   * NestJS fängt diese Exception automatisch ab und sendet eine passende
   * HTTP-Antwort mit Status 404 und einer Fehlermeldung.
   */
  async findOne(id: string): Promise<SafeUser> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return stripPassword(user);
  }

  /**
   * User-Daten aktualisieren (Name und/oder Avatar).
   *
   * Object.assign(user, dto) → Kopiert alle Felder aus dem DTO auf das User-Objekt.
   *   Beispiel: dto = { name: 'Bob' } → user.name wird auf 'Bob' gesetzt.
   *   Felder, die im DTO undefined sind, werden NICHT überschrieben.
   *   Das ist der Grund, warum PATCH (teilweises Update) funktioniert.
   *
   * .save(user) → Da "user" bereits eine ID hat, führt TypeORM ein UPDATE aus
   *   (nicht ein INSERT). TypeORM erkennt automatisch, ob es ein neues oder
   *   bestehendes Objekt ist, anhand der vorhandenen Primary Key (id).
   */
  async update(id: string, dto: UpdateUserDto): Promise<SafeUser> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    Object.assign(user, dto);
    await this.userRepo.save(user);
    return stripPassword(user);
  }

  /**
   * User löschen.
   *
   * .delete(id) → DELETE FROM users WHERE id = :id
   *
   * result.affected → Anzahl der gelöschten Zeilen (0 oder 1).
   * Falls 0 → Die ID existierte nicht → NotFoundException.
   *
   * Hinweis: Durch CASCADE-Constraints in der Datenbank werden auch
   * alle zugehörigen Daten (Kartenlisten, Spielfortschritt, etc.)
   * automatisch mitgelöscht.
   */
  async remove(id: string): Promise<void> {
    const result = await this.userRepo.delete(id);
    if (result.affected === 0)
      throw new NotFoundException(`User ${id} not found`);
  }
}
