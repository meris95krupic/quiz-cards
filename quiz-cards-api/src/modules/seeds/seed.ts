/**
 * =====================================================================
 * Seed-Script — Datenbank mit Beispieldaten befüllen
 * =====================================================================
 *
 * Dieses Script wird mit "npm run seed" ausgeführt und erstellt
 * zwei Beispiel-Kartenlisten mit je 10 Karten in der Datenbank.
 *
 * Seed-Scripte sind nützlich für:
 *   - Entwicklung: Sofort Testdaten zum Arbeiten haben
 *   - Demos: Die App mit sinnvollen Beispieldaten zeigen
 *   - Tests: Bekannte Ausgangsdaten für automatisierte Tests
 *
 * Wichtig: Das Script ist IDEMPOTENT — es kann beliebig oft ausgeführt
 * werden. Beim Start werden vorhandene Seed-Daten gelöscht und neu erstellt.
 *
 * NestFactory.createApplicationContext() startet die NestJS-App OHNE
 * HTTP-Server — nur die Dependency Injection und Datenbankverbindung
 * werden initialisiert. Perfekt für CLI-Scripte und Hintergrundjobs.
 */

// NestFactory: Die Fabrik-Klasse, die NestJS-Anwendungen erstellt.
// Hier nutzen wir createApplicationContext() statt create(),
// weil wir keinen HTTP-Server brauchen — nur die DI-Container + DB.
import { NestFactory } from '@nestjs/core';

// AppModule: Das Wurzel-Modul der Anwendung, das alle anderen Module bündelt.
// Durch das Laden des AppModules werden alle Entities, Services etc. verfügbar.
import { AppModule } from '../../app.module';

// DataSource: Die zentrale TypeORM-Datenbankverbindung.
// Darüber holen wir uns die Repositories für unsere Entities.
import { DataSource } from 'typeorm';

import { CardList } from '../card-lists/card-list.entity';
import { Card, CardType } from '../cards/card.entity';

async function seed() {
  /**
   * NestFactory.createApplicationContext(AppModule, { logger: ['error'] })
   *
   * Erstellt einen NestJS-Anwendungskontext (OHNE HTTP-Server):
   * - AppModule wird geladen → alle Module, Services, DB-Verbindungen werden initialisiert
   * - logger: ['error'] → Nur Fehlermeldungen loggen (unterdrückt die vielen
   *   NestJS-Startmeldungen wie "NestFactory starting...", "Mapped routes..." etc.)
   *
   * Das zurückgegebene "app"-Objekt bietet Zugriff auf den DI-Container,
   * sodass wir per app.get() beliebige Services/Providers abrufen können.
   */
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });

  /**
   * app.get(DataSource) → Holt die DataSource-Instanz aus dem DI-Container.
   *
   * Die DataSource ist der zentrale Einstiegspunkt für TypeORM.
   * Mit dataSource.getRepository(Entity) bekommt man ein Repository,
   * über das man CRUD-Operationen auf der jeweiligen Tabelle ausführen kann.
   */
  const dataSource = app.get(DataSource);

  /**
   * Repositories für die Entities abrufen.
   *
   * In einem Service würde man @InjectRepository(CardList) verwenden,
   * aber in einem Standalone-Script holt man Repositories direkt
   * über die DataSource. Das Ergebnis ist das gleiche Repository-Objekt.
   */
  const cardListRepo = dataSource.getRepository(CardList);
  const cardRepo = dataSource.getRepository(Card);

  /**
   * Idempotenz: Vorhandene Seed-Daten löschen.
   *
   * cardListRepo.delete({ title: 'Allgemeinwissen' }) löscht alle Zeilen,
   * deren Titel "Allgemeinwissen" ist. Dank CASCADE werden auch alle
   * zugehörigen Karten automatisch mitgelöscht.
   *
   * Warum nicht ALLE Daten löschen? Weil der User möglicherweise eigene
   * Listen erstellt hat, die nicht gelöscht werden sollen.
   */
  await cardListRepo.delete({ title: 'Allgemeinwissen' });
  await cardListRepo.delete({ title: 'Englisch–Deutsch Vokabeln' });

  // ── Seed 1: Allgemeinwissen ──────────────────────────────────────────────
  /**
   * cardListRepo.create() → Erstellt eine CardList-Entity im Speicher.
   *   ACHTUNG: Noch NICHT in der Datenbank! Erst .save() schreibt sie.
   *
   * cardListRepo.save() → Schreibt die Entity in die DB.
   *   TypeORM generiert automatisch eine UUID als Primary Key
   *   und setzt createdAt/updatedAt Timestamps.
   *
   * Hinweis: Diese Liste hat keine userId, weil Seed-Daten keinem
   * echten User gehören. In Produktion hätte jede Liste eine userId.
   */
  const generalList = cardListRepo.create({
    title: 'Allgemeinwissen',
    description: 'Mix aus Geografie, Geschichte und Wissenschaft',
    bgColor: '#6C63FF',
  });
  await cardListRepo.save(generalList);

  /**
   * Karten-Daten als Array von Partial<Card>.
   *
   * Partial<Card> ist ein TypeScript Utility Type: Alle Felder von Card
   * sind optional. Das ist praktisch, weil wir nicht alle Felder angeben
   * müssen (z.B. id, cardListId, createdAt werden automatisch gesetzt).
   *
   * Zwei Kartentypen:
   * - CardType.QA: Einfache Frage-Antwort-Karte (front = Frage, back = Antwort)
   * - CardType.MULTIPLE_CHOICE: Multiple-Choice mit options-Array und correctIndex
   */
  const generalCards: Partial<Card>[] = [
    {
      type: CardType.QA,
      front: 'Hauptstadt von Frankreich?',
      back: 'Paris',
      bgColor: '#FF6584',
      position: 0,
    },
    {
      type: CardType.MULTIPLE_CHOICE,
      front: 'Welches Element hat das chemische Symbol "O"?',
      options: ['Gold', 'Osmium', 'Sauerstoff', 'Silber'],
      correctIndex: 2, // Index 2 = "Sauerstoff" (0-basiert)
      back: 'Sauerstoff',
      bgColor: '#43CBFF',
      position: 1,
    },
    {
      type: CardType.QA,
      front: 'In welchem Jahr fiel die Berliner Mauer?',
      back: '1989',
      position: 2,
    },
    {
      type: CardType.MULTIPLE_CHOICE,
      front: 'Wie viele Kontinente gibt es auf der Erde?',
      options: ['5', '6', '7', '8'],
      correctIndex: 2, // Index 2 = "7"
      back: '7',
      bgColor: '#F7971E',
      position: 3,
    },
    {
      type: CardType.QA,
      front: 'Wer schrieb "Romeo und Julia"?',
      back: 'William Shakespeare',
      bgColor: '#9708CC',
      position: 4,
    },
    {
      type: CardType.MULTIPLE_CHOICE,
      front: 'Was ist die schnellste Kreatur der Welt?',
      options: [
        'Gepard',
        'Falke (Stoßflug)',
        'Schwertfisch',
        'Gepard (Wasser)',
      ],
      correctIndex: 1, // Index 1 = "Falke (Stoßflug)"
      back: 'Falke (im Stoßflug)',
      position: 5,
    },
    {
      type: CardType.QA,
      front: 'Wie viele Planeten hat unser Sonnensystem?',
      back: '8',
      bgColor: '#00D4AA',
      position: 6,
    },
    {
      type: CardType.MULTIPLE_CHOICE,
      front: 'Welche Sprache wird in Brasilien gesprochen?',
      options: ['Spanisch', 'Portugiesisch', 'Englisch', 'Brasilianisch'],
      correctIndex: 1, // Index 1 = "Portugiesisch"
      back: 'Portugiesisch',
      position: 7,
    },
    {
      type: CardType.QA,
      front: 'Was ist die kleinste Primzahl?',
      back: '2',
      position: 8,
    },
    {
      type: CardType.MULTIPLE_CHOICE,
      front: 'Welcher Ozean ist der größte?',
      options: ['Atlantik', 'Indik', 'Arktis', 'Pazifik'],
      correctIndex: 3, // Index 3 = "Pazifik"
      back: 'Pazifik',
      bgColor: '#FF6584',
      position: 9,
    },
  ];

  /**
   * Karten in die Datenbank speichern.
   *
   * generalCards.map((c) => cardRepo.create({ ...c, cardListId: generalList.id }))
   *
   * Schritt für Schritt:
   * 1. .map() iteriert über jedes Karten-Objekt
   * 2. { ...c, cardListId: generalList.id } → Spread-Operator kopiert alle Felder
   *    und fügt die cardListId hinzu (Fremdschlüssel zur Kartenliste)
   * 3. cardRepo.create() erstellt eine Card-Entity im Speicher
   * 4. cardRepo.save() speichert ALLE Karten auf einmal (Batch-Insert)
   */
  await cardRepo.save(
    generalCards.map((c) =>
      cardRepo.create({ ...c, cardListId: generalList.id }),
    ),
  );

  // ── Seed 2: Englisch–Deutsch Vokabeln ─────────────────────────────────────
  const vocabList = cardListRepo.create({
    title: 'Englisch–Deutsch Vokabeln',
    description: 'Einfache englische Wörter auf Deutsch übersetzen',
    bgColor: '#43CBFF',
  });
  await cardListRepo.save(vocabList);

  /**
   * Vokabel-Karten: Alle vom Typ QA (einfache Frage-Antwort).
   * front = englisches Wort, back = deutsche Übersetzung.
   */
  const vocabCards: Partial<Card>[] = [
    {
      type: CardType.QA,
      front: 'apple',
      back: 'Apfel',
      bgColor: '#FF6584',
      position: 0,
    },
    {
      type: CardType.QA,
      front: 'butterfly',
      back: 'Schmetterling',
      bgColor: '#6C63FF',
      position: 1,
    },
    { type: CardType.QA, front: 'umbrella', back: 'Regenschirm', position: 2 },
    {
      type: CardType.QA,
      front: 'strawberry',
      back: 'Erdbeere',
      bgColor: '#F7971E',
      position: 3,
    },
    {
      type: CardType.QA,
      front: 'cloud',
      back: 'Wolke',
      bgColor: '#00D4AA',
      position: 4,
    },
    { type: CardType.QA, front: 'lighthouse', back: 'Leuchtturm', position: 5 },
    {
      type: CardType.QA,
      front: 'spider',
      back: 'Spinne',
      bgColor: '#9708CC',
      position: 6,
    },
    { type: CardType.QA, front: 'thunder', back: 'Donner', position: 7 },
    {
      type: CardType.QA,
      front: 'mirror',
      back: 'Spiegel',
      bgColor: '#FF6584',
      position: 8,
    },
    {
      type: CardType.QA,
      front: 'bridge',
      back: 'Brücke',
      bgColor: '#43CBFF',
      position: 9,
    },
  ];

  await cardRepo.save(
    vocabCards.map((c) => cardRepo.create({ ...c, cardListId: vocabList.id })),
  );

  console.log('✅ Seed completed: 2 card lists with 10 cards each');

  /**
   * app.close() → Fährt die NestJS-Anwendung sauber herunter.
   * Schließt die Datenbankverbindung und gibt alle Ressourcen frei.
   * Ohne close() würde das Script hängen bleiben (offene DB-Connection).
   */
  await app.close();
}

/**
 * seed().catch() → Fängt unbehandelte Fehler ab.
 * Falls das Seeding fehlschlägt (z.B. DB nicht erreichbar, Entity-Fehler),
 * wird der Fehler geloggt und das Script mit Exit-Code 1 beendet.
 * Exit-Code 1 signalisiert dem Betriebssystem: "Es gab einen Fehler."
 */
seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
