/**
 * =====================================================================
 * ShopService — Geschäftslogik für den Kartenlisten-Shop
 * =====================================================================
 *
 * Dieser Service implementiert den kompletten Shop-Workflow:
 *
 * 1. submit()         → User reicht Kartenliste ein (pending/auto-approved für Admins)
 * 2. findApproved()   → Öffentlich: alle genehmigten Listen anzeigen
 * 3. findPending()    → Admin: alle wartenden Einreichungen anzeigen
 * 4. approve()        → Admin: Einreichung genehmigen
 * 5. reject()         → Admin: Einreichung ablehnen
 * 6. remove()         → Eigene Einreichung löschen (oder Admin: jede löschen)
 * 7. importToMyLists() → Genehmigte Liste kopieren in eigene Sammlung
 *
 * Admin-Erkennung: Die ADMIN_EMAIL Umgebungsvariable wird mit der
 * E-Mail des eingeloggten Users verglichen. Einfach, aber effektiv.
 */

import {
  ConflictException, // HTTP 409 — Ressource existiert bereits / Konflikt
  ForbiddenException, // HTTP 403 — Zugriff verweigert (keine Berechtigung)
  Injectable,
  NotFoundException, // HTTP 404 — Ressource nicht gefunden
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

// ConfigService: NestJS-Dienst zum Lesen von Umgebungsvariablen (typisiert)
import { ConfigService } from '@nestjs/config';

import { ShopSubmission } from './shop-submission.entity';
import { CardList } from '../card-lists/card-list.entity';
import { Card } from '../cards/card.entity';
import { User } from '../users/user.entity';

@Injectable()
export class ShopService {
  /**
   * Die Admin-E-Mail wird einmalig im Constructor aus der Konfiguration gelesen
   * und als private Eigenschaft gespeichert, damit nicht bei jedem Request
   * die Config erneut abgefragt werden muss.
   */
  private readonly adminEmail: string;

  constructor(
    /**
     * Drei Repositories per @InjectRepository injiziert:
     * - submissionRepo: CRUD für ShopSubmission-Tabelle
     * - cardListRepo: Zum Lesen der originalen Kartenliste bei Submit
     * - DataSource: Für Transaktionen beim Import
     */
    @InjectRepository(ShopSubmission)
    private readonly submissionRepo: Repository<ShopSubmission>,
    @InjectRepository(CardList)
    private readonly cardListRepo: Repository<CardList>,
    private readonly dataSource: DataSource,

    /**
     * ConfigService — Der NestJS-Weg, Umgebungsvariablen zu lesen.
     *
     * Statt direkt process.env.ADMIN_EMAIL zu verwenden, nutzt man den
     * ConfigService, weil:
     * 1. Typsicherheit: config.get<string>('adminEmail') ist typisiert
     * 2. Validierung: Umgebungsvariablen können beim App-Start geprüft werden
     * 3. Testbarkeit: ConfigService lässt sich leicht mocken in Unit-Tests
     */
    private readonly config: ConfigService,
  ) {
    // Admin-E-Mail aus der Konfiguration lesen, mit Fallback-Wert
    this.adminEmail =
      this.config.get<string>('adminEmail') ?? 'meris-k@hotmail.com';
  }

  /**
   * Prüft, ob ein User Admin-Rechte hat.
   * Einfacher E-Mail-Vergleich — in Produktionsumgebungen würde man
   * eher ein Rollen-System (z.B. user.role === 'admin') verwenden.
   */
  isAdmin(user: User): boolean {
    return user.email === this.adminEmail;
  }

  /**
   * Eine Kartenliste zum Shop einreichen.
   *
   * Ablauf:
   * 1. Prüfen, ob die Kartenliste existiert
   * 2. Prüfen, ob bereits eine "pending" Einreichung für diese Liste existiert
   *    → Falls ja: ConflictException (409), keine Doppel-Einreichungen
   * 3. Einreichung erstellen:
   *    - Admins → Status direkt "approved" (Auto-Genehmigung)
   *    - Normale User → Status "pending" (muss vom Admin geprüft werden)
   *
   * this.submissionRepo.create() → Entity-Instanz im Speicher erstellen
   * this.submissionRepo.save()   → In die Datenbank schreiben
   */
  async submit(cardListId: string, user: User): Promise<ShopSubmission> {
    const list = await this.cardListRepo.findOne({ where: { id: cardListId } });
    if (!list) throw new NotFoundException('Kartenliste nicht gefunden');

    // Duplikat-Check: Gibt es bereits eine wartende Einreichung für diese Liste?
    const existing = await this.submissionRepo.findOne({
      where: { cardListId, status: 'pending' },
    });
    if (existing)
      throw new ConflictException('Diese Liste wurde bereits eingereicht');

    const isAdmin = this.isAdmin(user);
    const submission = this.submissionRepo.create({
      cardListId,
      submittedBy: user.id,
      // Admins werden automatisch genehmigt, andere müssen warten
      status: isAdmin ? 'approved' : 'pending',
      reviewedAt: isAdmin ? new Date() : null,
    });

    return this.submissionRepo.save(submission);
  }

  /**
   * Alle genehmigten Shop-Einträge abrufen (öffentlich, kein JWT nötig).
   *
   * Sortierung: Neueste Einreichungen zuerst (submittedAt DESC).
   * where: { status: 'approved' } filtert nur genehmigte Einträge.
   */
  findApproved(): Promise<ShopSubmission[]> {
    return this.submissionRepo.find({
      where: { status: 'approved' },
      order: { submittedAt: 'DESC' },
    });
  }

  /**
   * Alle wartenden Einreichungen abrufen (nur für Admins).
   *
   * ForbiddenException → HTTP 403 wird geworfen, wenn der User kein Admin ist.
   * Sortierung: Älteste zuerst (ASC), damit der Admin die ältesten zuerst prüft.
   */
  findPending(user: User): Promise<ShopSubmission[]> {
    if (!this.isAdmin(user)) throw new ForbiddenException();
    return this.submissionRepo.find({
      where: { status: 'pending' },
      order: { submittedAt: 'ASC' },
    });
  }

  /**
   * Eine Einreichung genehmigen (nur Admin).
   *
   * 1. Admin-Check → 403 bei Nicht-Admins
   * 2. Einreichung laden → 404 falls nicht gefunden
   * 3. Status auf "approved" setzen + reviewedAt-Zeitstempel
   * 4. Speichern → save() erkennt, dass die Entity bereits eine ID hat,
   *    und führt ein UPDATE statt INSERT aus.
   */
  async approve(id: string, user: User): Promise<ShopSubmission> {
    if (!this.isAdmin(user)) throw new ForbiddenException();
    const sub = await this.submissionRepo.findOne({ where: { id } });
    if (!sub) throw new NotFoundException();
    sub.status = 'approved';
    sub.reviewedAt = new Date();
    return this.submissionRepo.save(sub);
  }

  /**
   * Eine Einreichung ablehnen (nur Admin).
   * Gleiche Logik wie approve(), nur mit status = 'rejected'.
   */
  async reject(id: string, user: User): Promise<ShopSubmission> {
    if (!this.isAdmin(user)) throw new ForbiddenException();
    const sub = await this.submissionRepo.findOne({ where: { id } });
    if (!sub) throw new NotFoundException();
    sub.status = 'rejected';
    sub.reviewedAt = new Date();
    return this.submissionRepo.save(sub);
  }

  /**
   * Einreichung löschen — nur der Ersteller oder ein Admin darf das.
   *
   * Berechtigungsprüfung:
   * - Admins dürfen JEDE Einreichung löschen
   * - Normale User dürfen NUR ihre EIGENE Einreichung löschen
   *   (sub.submittedBy === user.id)
   *
   * this.submissionRepo.delete(id) → Löscht die Zeile direkt per ID.
   *   Unterschied zu .remove(): .delete() braucht keine Entity-Instanz,
   *   sondern nur die ID. Beide löschen die Zeile aus der Datenbank.
   */
  async remove(id: string, user: User): Promise<void> {
    const sub = await this.submissionRepo.findOne({ where: { id } });
    if (!sub) throw new NotFoundException();
    if (!this.isAdmin(user) && sub.submittedBy !== user.id)
      throw new ForbiddenException();
    await this.submissionRepo.delete(id);
  }

  /**
   * Eine genehmigte Shop-Liste in die eigene Sammlung importieren.
   *
   * Das ist die komplexeste Methode: Sie erstellt eine VOLLSTÄNDIGE KOPIE
   * der Kartenliste + aller zugehörigen Karten für den eingeloggten User.
   *
   * Ablauf:
   * 1. ShopSubmission laden MIT Relationen:
   *    relations: ['cardList', 'cardList.cards'] lädt die verknüpfte CardList
   *    UND deren Karten in einem Aufruf (verschachteltes Eager Loading).
   *
   * 2. where: { status: 'approved' } → Nur genehmigte Listen dürfen importiert werden.
   *
   * 3. Transaktion:
   *    a) Neue CardList erstellen (gleicher Inhalt, aber mit userId des Importeurs)
   *    b) Alle Karten kopieren (gleicher Inhalt, aber mit der neuen cardListId)
   *    c) Alles zusammen speichern
   *
   * Falls ein Fehler auftritt → automatisches Rollback der gesamten Transaktion.
   */
  async importToMyLists(submissionId: string, user: User): Promise<CardList> {
    const sub = await this.submissionRepo.findOne({
      where: { id: submissionId, status: 'approved' },
      // Verschachteltes Eager Loading: ShopSubmission → CardList → Cards
      relations: ['cardList', 'cardList.cards'],
    });
    if (!sub)
      throw new NotFoundException(
        'Shop-Eintrag nicht gefunden oder nicht genehmigt',
      );

    // Die originale Kartenliste, die kopiert werden soll
    const original = sub.cardList;

    return this.dataSource.transaction(async (manager) => {
      // Schritt 1: Kopie der Kartenliste erstellen (mit neuer userId)
      const copy = manager.create(CardList, {
        userId: user.id, // Die Kopie gehört dem importierenden User
        title: original.title,
        description: original.description,
        bgColor: original.bgColor,
      });
      await manager.save(copy);

      // Schritt 2: Alle Karten kopieren und der neuen Liste zuordnen
      const cards = (original.cards ?? []).map((c) =>
        manager.create(Card, {
          cardListId: copy.id, // Neue Fremdschlüssel-Referenz auf die Kopie
          type: c.type,
          front: c.front,
          back: c.back,
          options: c.options,
          correctIndex: c.correctIndex,
          position: c.position,
          bgColor: c.bgColor,
        }),
      );
      await manager.save(cards);

      // Karten an die Kopie anhängen für die vollständige Response
      copy.cards = cards;
      return copy;
    });
  }
}
