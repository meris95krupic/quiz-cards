/**
 * ============================================================================
 * GAMES SERVICE — Die gesamte Geschäftslogik für Spiele
 * ============================================================================
 *
 * Ein Service in NestJS enthält die GESAMTE Geschäftslogik eines Features.
 * Während der Controller nur HTTP-Requests entgegennimmt und weiterleitet,
 * macht der Service die eigentliche Arbeit:
 *   - Datenbankabfragen
 *   - Berechnungen
 *   - Validierungen
 *   - Transaktionen
 *
 * @Injectable() markiert die Klasse für das Dependency-Injection-System.
 * Ohne @Injectable() könnte NestJS diese Klasse nicht automatisch in
 * Controller oder andere Services injizieren.
 *
 * REPOSITORY PATTERN:
 * Statt direkt SQL zu schreiben, nutzen wir TypeORM-Repositories.
 * Ein Repository ist wie ein "Werkzeugkasten" für eine Datenbank-Tabelle:
 *   - repo.find()    → SELECT * FROM ...
 *   - repo.findOne() → SELECT * FROM ... WHERE ... LIMIT 1
 *   - repo.create()  → Erstellt ein Entity-Objekt (noch NICHT in der DB!)
 *   - repo.save()    → INSERT oder UPDATE in der DB
 *   - repo.delete()  → DELETE FROM ...
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Game, GameStatus } from './game.entity';
import { GamePlayer } from './game-player.entity';
import { GameTurn, TurnResult } from './game-turn.entity';
import { CardList } from '../card-lists/card-list.entity';
import { Card, CardType } from '../cards/card.entity';
import {
  CardProgress,
  MAX_LEVEL,
  MIN_LEVEL,
} from '../cards/card-progress.entity';
import { CreateGameDto } from './dto/create-game.dto';
import { AddPlayerDto } from './dto/add-player.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Fisher-Yates Shuffle — Standard-Algorithmus zum zufälligen Mischen eines Arrays.
 *
 * Geht das Array von hinten nach vorne durch und tauscht jedes Element
 * mit einem zufällig gewählten Element davor. Ergibt eine gleichmäßige
 * Zufallsverteilung (jede Reihenfolge ist gleich wahrscheinlich).
 *
 * Wichtig: Erstellt eine KOPIE des Arrays ([...arr]), damit das
 * Original-Array nicht verändert wird (Immutability-Prinzip).
 */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * GEWICHTETE KARTENAUSWAHL — Intelligente Kartenverteilung für Solo-Spiel
 *
 * Karten, die der Spieler noch nicht gut kennt (niedriges Level), werden
 * häufiger ausgewählt als Karten, die er bereits beherrscht (hohes Level).
 *
 * Gewichtung: Level 1 → Gewicht 10 (kommt 10x in den Pool)
 *             Level 5 → Gewicht 6  (kommt 6x in den Pool)
 *             Level 10 → Gewicht 1  (kommt 1x in den Pool)
 *
 * Ablauf:
 *   1. Für jede Karte: Füge sie (MAX_LEVEL + 1 - level) mal in den Pool
 *   2. Mische den Pool zufällig
 *   3. Gehe durch den gemischten Pool und nimm die ersten `count` EINZIGARTIGEN Karten
 *   4. Falls nicht genug: Fülle mit verbleibenden Karten auf
 *
 * @param cards       - Alle verfügbaren Karten
 * @param progressMap - Map von CardId → aktuelles Level des Spielers
 * @param count       - Wie viele Karten ausgewählt werden sollen
 */
function selectWeighted(
  cards: Card[],
  progressMap: Map<string, number>,
  count: number,
): Card[] {
  // Schritt 1: Gewichteten Pool aufbauen
  // Karten mit niedrigem Level kommen öfter rein → höhere Chance, gezogen zu werden
  const pool: Card[] = [];
  for (const card of cards) {
    const level = progressMap.get(card.id) ?? 1; // Neue Karten starten bei Level 1
    const weight = MAX_LEVEL + 1 - level; // level 1→10, level 10→1
    for (let i = 0; i < weight; i++) pool.push(card);
  }

  // Schritt 2+3: Pool mischen und einzigartige Karten herausfiltern
  const shuffled = shuffle(pool);
  const seen = new Set<string>(); // Merkt sich bereits gewählte Karten-IDs
  const selected: Card[] = [];
  for (const card of shuffled) {
    if (!seen.has(card.id)) {
      seen.add(card.id);
      selected.push(card);
      if (selected.length >= count) break;
    }
  }

  // Schritt 4: Auffüllen falls nötig (kann passieren, wenn count > Anzahl Karten im Pool)
  if (selected.length < count) {
    for (const card of shuffle(cards)) {
      if (!seen.has(card.id)) {
        seen.add(card.id);
        selected.push(card);
        if (selected.length >= count) break;
      }
    }
  }

  return selected;
}

/**
 * @Injectable() — Macht diese Klasse für NestJS' Dependency Injection verfügbar.
 *
 * NestJS erstellt genau EINE Instanz (Singleton) und gibt sie überall dort rein,
 * wo sie als Dependency angefordert wird (z.B. im GamesController).
 */
@Injectable()
export class GamesService {
  /**
   * CONSTRUCTOR MIT DEPENDENCY INJECTION
   *
   * @InjectRepository(Entity) — Injiziert das TypeORM-Repository für die
   * angegebene Entity. Jedes Repository ist an eine Datenbank-Tabelle gebunden.
   *
   * Repository<Game> ist wie ein typsicherer Datenbankzugriff:
   *   this.gameRepo.find()     → SELECT * FROM games
   *   this.gameRepo.findOne()  → SELECT * FROM games WHERE ... LIMIT 1
   *   this.gameRepo.save(game) → INSERT/UPDATE games SET ...
   *
   * DataSource — Die zentrale TypeORM-Verbindung zur Datenbank.
   * Wir brauchen sie für TRANSAKTIONEN (siehe submitAnswer).
   * DataSource wird von NestJS automatisch bereitgestellt, sobald
   * TypeOrmModule.forRoot() in app.module.ts konfiguriert ist.
   */
  constructor(
    @InjectRepository(Game) private readonly gameRepo: Repository<Game>,
    @InjectRepository(GamePlayer)
    private readonly playerRepo: Repository<GamePlayer>,
    @InjectRepository(GameTurn)
    private readonly turnRepo: Repository<GameTurn>,
    @InjectRepository(CardList)
    private readonly cardListRepo: Repository<CardList>,
    @InjectRepository(Card) private readonly cardRepo: Repository<Card>,
    @InjectRepository(CardProgress)
    private readonly progressRepo: Repository<CardProgress>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * SPIEL ERSTELLEN — POST /games
   *
   * Erstellt ein neues Spiel im Status LOBBY.
   * Im LOBBY-Status können sich Spieler beitreten, bevor das Spiel startet.
   *
   * this.gameRepo.create() erstellt ein Entity-Objekt im Speicher (noch NICHT in der DB).
   * this.gameRepo.save()   schreibt es dann tatsächlich in die Datenbank (INSERT).
   *
   * Dieses Zwei-Schritt-Muster (create → save) ist TypeORM-Standard:
   *   - create() setzt Default-Werte und Typ-Checks
   *   - save() macht den eigentlichen SQL INSERT und gibt das Objekt MIT generierter ID zurück
   */
  async create(dto: CreateGameDto): Promise<Game> {
    // Zuerst prüfen, ob die Kartenliste existiert
    const cardList = await this.cardListRepo.findOne({
      where: { id: dto.cardListId },
    });
    if (!cardList) throw new NotFoundException('Card list not found');

    // Spiel-Objekt erstellen (noch nicht in der DB)
    const game = this.gameRepo.create({
      cardListId: dto.cardListId,
      status: GameStatus.LOBBY, // Startet immer im LOBBY-Status
      currentCardIndex: 0, // Zeigt auf die erste Karte
      cardOrder: null, // Wird erst beim Start festgelegt
    });

    // In die Datenbank schreiben und zurückgeben (mit generierter UUID)
    return this.gameRepo.save(game);
  }

  /**
   * SPIEL ABRUFEN — GET /games/:id
   *
   * relations: ['players', 'cardList'] — Sagt TypeORM, dass es die
   * verknüpften Spieler und die Kartenliste gleich MITLEADEN soll.
   *
   * Ohne "relations" wären game.players und game.cardList undefined,
   * da TypeORM standardmäßig KEINE Relationen lädt (Lazy Loading).
   * Das ist ein häufiger Anfängerfehler!
   *
   * Alternativen zum "relations"-Parameter:
   *   - Eager Loading: In der Entity @ManyToOne({ eager: true })
   *   - QueryBuilder: .leftJoinAndSelect('game.players', 'players')
   */
  async findOne(id: string): Promise<Game> {
    const game = await this.gameRepo.findOne({
      where: { id },
      relations: ['players', 'cardList'],
    });
    if (!game) throw new NotFoundException(`Game ${id} not found`);
    return game;
  }

  /**
   * SPIELZUSTAND ABRUFEN — GET /games/:id/state
   *
   * Der zentrale Endpunkt für das POLLING-System im Online-Multiplayer.
   * Das Frontend ruft diesen Endpunkt alle 2,5 Sekunden auf, um zu wissen:
   *   - status:           LOBBY / IN_PROGRESS / FINISHED
   *   - currentCardIndex: Welche Karte gerade dran ist
   *   - totalCards:       Wie viele Karten insgesamt
   *   - players:          Alle Spieler mit ihren Scores
   *   - currentPlayer:    Wer gerade am Zug ist
   *   - card:             Die aktuelle Karte (mit Frage + Antwortmöglichkeiten)
   *
   * Wenn status !== IN_PROGRESS → card und currentPlayer sind null
   * (Spiel hat noch nicht begonnen oder ist schon vorbei)
   */
  async getState(gameId: string): Promise<{
    status: string;
    currentCardIndex: number;
    totalCards: number;
    players: GamePlayer[];
    currentPlayer: GamePlayer | null;
    card: Card | null;
  }> {
    const game = await this.gameRepo.findOne({
      where: { id: gameId },
      relations: ['players'],
    });
    if (!game) throw new NotFoundException(`Game ${gameId} not found`);

    // Spieler nach turnOrder sortieren (bestimmt die Reihenfolge der Züge)
    const players = [...game.players].sort((a, b) => a.turnOrder - b.turnOrder);

    // Falls das Spiel noch nicht läuft oder schon beendet ist:
    // Kein aktueller Spieler und keine aktuelle Karte
    if (game.status !== GameStatus.IN_PROGRESS) {
      return {
        status: game.status,
        currentCardIndex: game.currentCardIndex,
        totalCards: game.cardOrder?.length ?? 0,
        players,
        currentPlayer: null,
        card: null,
      };
    }

    // Karten in der gespeicherten Reihenfolge laden
    const { orderedCards, totalPlayable } = await this.getOrderedCards(game);

    // Aktuelle Karte ermitteln (oder null wenn alle Karten durch sind)
    const card =
      game.currentCardIndex < totalPlayable
        ? orderedCards[game.currentCardIndex]
        : null;

    // Aktuellen Spieler per Modulo-Operator bestimmen:
    // cardIndex 0 → Spieler 0, cardIndex 1 → Spieler 1, ...
    // Bei 3 Spielern: cardIndex 3 → Spieler 0 (Modulo setzt zurück)
    // So wird reihum gespielt!
    const currentPlayer = card
      ? players[game.currentCardIndex % players.length]
      : null;

    return {
      status: game.status,
      currentCardIndex: game.currentCardIndex,
      totalCards: totalPlayable,
      players,
      currentPlayer,
      card,
    };
  }

  /**
   * SPIELER HINZUFÜGEN — POST /games/:id/players
   *
   * Fügt einen neuen Spieler zur Lobby hinzu. Zwei Modi:
   *   - Quick Play: Nur Name + AvatarId (kein userId)
   *   - Registrierter User: Mit userId → ermöglicht Lernfortschritt-Tracking
   *
   * sessionToken: Ein zufällig generierter UUID-Token, der im Browser
   * (sessionStorage) gespeichert wird. Damit identifiziert sich der Spieler
   * bei jedem weiteren Request, ohne eingeloggt sein zu müssen.
   * Das ist wichtig für Quick-Play-Spieler, die keinen JWT-Token haben.
   *
   * turnOrder: Die Reihenfolge, in der die Spieler dran sind.
   * Der erste Spieler bekommt 0, der zweite 1, usw.
   */
  async addPlayer(gameId: string, dto: AddPlayerDto): Promise<GamePlayer> {
    const game = await this.gameRepo.findOne({
      where: { id: gameId },
      relations: ['players'],
    });
    if (!game) throw new NotFoundException(`Game ${gameId} not found`);

    // Spieler können nur in der Lobby hinzugefügt werden
    if (game.status !== GameStatus.LOBBY) {
      throw new BadRequestException(
        'Cannot add players after game has started',
      );
    }

    const player = this.playerRepo.create({
      gameId,
      userId: dto.userId ?? null, // null = Quick-Play-Spieler
      name: dto.name,
      avatarId: dto.avatarId,
      score: 0,
      turnOrder: game.players.length, // Nächste Position in der Reihenfolge
      sessionToken: uuidv4(), // Einzigartiger Token zur Identifikation
    });
    return this.playerRepo.save(player);
  }

  /**
   * SPIEL STARTEN — POST /games/:id/start
   *
   * Überführt das Spiel von LOBBY → IN_PROGRESS und legt die Kartenreihenfolge fest.
   *
   * KARTEN-VERTEILUNGS-ALGORITHMUS:
   * ================================
   * Math.floor(cards.length / playerCount) * playerCount
   *
   * Beispiel: 10 Karten, 3 Spieler
   *   → Math.floor(10/3) * 3 = 3 * 3 = 9 Karten werden gespielt
   *   → 1 Karte wird übersprungen (Rest)
   *   → So bekommt jeder Spieler exakt gleich viele Züge (hier: 3)
   *
   * SOLO-MODUS MIT GEWICHTETER AUSWAHL:
   * Wenn ein einzelner registrierter Spieler spielt, werden Karten nicht
   * einfach zufällig gemischt, sondern GEWICHTET ausgewählt.
   * Karten mit niedrigem Level (die der Spieler noch nicht gut kann)
   * erscheinen häufiger → optimales Lernen!
   */
  async start(gameId: string): Promise<Game> {
    const game = await this.gameRepo.findOne({
      where: { id: gameId },
      relations: ['players'],
    });
    if (!game) throw new NotFoundException(`Game ${gameId} not found`);
    if (game.status !== GameStatus.LOBBY) {
      throw new BadRequestException('Game already started');
    }
    if (game.players.length < 1) {
      throw new BadRequestException('Need at least 1 player to start');
    }

    // Alle Karten der Kartenliste laden, sortiert nach Position
    const cards = await this.cardRepo.find({
      where: { cardListId: game.cardListId! },
      order: { position: 'ASC' },
    });

    const playerCount = game.players.length;

    // Kartenzahl so berechnen, dass sie gleichmäßig auf alle Spieler verteilt werden kann
    const count = Math.floor(cards.length / playerCount) * playerCount;

    // Prüfen ob Solo-Modus mit registriertem User (für gewichtete Auswahl)
    const soloUserId =
      playerCount === 1 ? (game.players[0].userId ?? null) : null;

    let selected: Card[];
    if (soloUserId) {
      // GEWICHTETE AUSWAHL: Lernfortschritt des Spielers laden
      // und Karten bevorzugen, die er noch nicht gut kann
      const progressRows = await this.progressRepo.find({
        where: { userId: soloUserId },
        select: ['cardId', 'level'],
      });
      const progressMap = new Map(progressRows.map((p) => [p.cardId, p.level]));
      selected = selectWeighted(cards, progressMap, count);
    } else {
      // STANDARD: Einfach zufällig mischen und die ersten `count` nehmen
      selected = shuffle(cards).slice(0, count);
    }

    // Kartenreihenfolge als Array von IDs speichern (JSONB-Spalte in der DB)
    // Dadurch bleibt die Reihenfolge für alle Polling-Requests konsistent
    game.cardOrder = selected.map((c) => c.id);
    game.status = GameStatus.IN_PROGRESS;
    game.currentCardIndex = 0;
    return this.gameRepo.save(game);
  }

  /**
   * AKTUELLE KARTE ABRUFEN — GET /games/:id/current-card
   *
   * Gibt die aktuelle Karte, den aktuellen Spieler und den Kartenfortschritt zurück.
   * Wird vom Frontend verwendet, um die Spielansicht darzustellen.
   */
  async getCurrentCard(gameId: string): Promise<{
    card: Card;
    currentPlayer: GamePlayer;
    cardIndex: number;
    totalCards: number;
    cardLevel: number;
  }> {
    const game = await this.gameRepo.findOne({
      where: { id: gameId },
      relations: ['players'],
    });
    if (!game) throw new NotFoundException(`Game ${gameId} not found`);
    if (game.status !== GameStatus.IN_PROGRESS) {
      throw new BadRequestException('Game is not in progress');
    }

    const { orderedCards, totalPlayable } = await this.getOrderedCards(game);

    if (game.currentCardIndex >= totalPlayable) {
      throw new BadRequestException('No more cards – game should be finished');
    }

    const card = orderedCards[game.currentCardIndex];
    const players = [...game.players].sort((a, b) => a.turnOrder - b.turnOrder);
    const currentPlayer = players[game.currentCardIndex % players.length];

    // Karten-Level für Solo-User ermitteln (für die Level-Anzeige im Frontend)
    const soloUserId =
      players.length === 1 ? (players[0].userId ?? null) : null;
    let cardLevel = 1;
    if (soloUserId) {
      const progress = await this.progressRepo.findOne({
        where: { userId: soloUserId, cardId: card.id },
      });
      cardLevel = progress?.level ?? 1;
    }

    return {
      card,
      currentPlayer,
      cardIndex: game.currentCardIndex,
      totalCards: totalPlayable,
      cardLevel,
    };
  }

  /**
   * ANTWORT EINREICHEN — POST /games/:id/answer
   *
   * ═══════════════════════════════════════════════════════════════════════════
   * TRANSAKTION + PESSIMISTIC LOCKING — Die kritischste Methode im Service!
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * PROBLEM: Was passiert, wenn zwei Spieler gleichzeitig eine Antwort senden?
   *
   * Ohne Schutz könnte Folgendes passieren:
   *   1. Spieler A liest: currentCardIndex = 5
   *   2. Spieler B liest: currentCardIndex = 5  (gleichzeitig!)
   *   3. Spieler A setzt: currentCardIndex = 6
   *   4. Spieler B setzt: currentCardIndex = 6  (überschreibt A's Änderung!)
   *   → Karte 5 wurde ZWEIMAL beantwortet, Karte 6 wird übersprungen!
   *
   * LÖSUNG: Datenbank-Transaktion mit Pessimistic Write Lock
   *
   * this.dataSource.transaction(async (manager) => { ... })
   * ──────────────────────────────────────────────────────
   * Erstellt eine TRANSAKTION: Alle DB-Operationen innerhalb des Callbacks
   * werden als EINE atomare Einheit ausgeführt. Entweder ALLE Änderungen
   * werden gespeichert (Commit) oder KEINE (Rollback bei Fehler).
   *
   * Der "manager" (EntityManager) ist ein spezieller Datenbank-Zugriff,
   * der innerhalb dieser Transaktion arbeitet. Statt this.gameRepo.find()
   * nutzen wir manager.findOne(), damit alles in der gleichen Transaktion läuft.
   *
   * lock: { mode: 'pessimistic_write' }
   * ────────────────────────────────────
   * Das ist das Herzstück: Ein "FOR UPDATE" Lock auf die Game-Zeile.
   *
   * Wenn Spieler A die Game-Zeile mit pessimistic_write lädt:
   *   → Die Zeile wird in der Datenbank GESPERRT
   *   → Spieler B's Anfrage WARTET, bis Spieler A fertig ist
   *   → Erst wenn A's Transaktion committed, kann B lesen
   *   → B liest dann den AKTUALISIERTEN currentCardIndex
   *
   * WARUM NUR DIE GAME-ZEILE LOCKEN?
   * ────────────────────────────────────
   * PostgreSQL hat ein Problem: FOR UPDATE + JOIN (also Lock mit Relationen)
   * schlägt fehl mit: "FOR UPDATE cannot be applied to the nullable side of an outer join"
   *
   * Deshalb:
   *   1. Game-Zeile laden MIT Lock (ohne relations)
   *   2. Players SEPARAT laden (ohne Lock) im selben Manager/Transaktion
   *
   * Die Players-Zeilen brauchen keinen Lock, weil wir nur den Score eines
   * BESTIMMTEN Spielers ändern und jeder Spieler nur SEINEN Score ändert.
   */
  async submitAnswer(
    gameId: string,
    dto: SubmitAnswerDto,
  ): Promise<{
    turn: GameTurn;
    game: Game;
    isFinished: boolean;
    newCardLevel: number;
  }> {
    // ┌─────────────────────────────────────────────────────────────────────┐
    // │ TRANSAKTION STARTEN                                                │
    // │ Alles innerhalb dieses Callbacks ist eine atomare DB-Operation.    │
    // │ Bei einem Fehler werden ALLE Änderungen zurückgerollt (Rollback).  │
    // └─────────────────────────────────────────────────────────────────────┘
    return this.dataSource.transaction(async (manager) => {
      // ── Schritt 1: Game-Zeile MIT PESSIMISTIC WRITE LOCK laden ──
      // SQL: SELECT * FROM games WHERE id = ? FOR UPDATE
      // → Sperrt diese Zeile, bis die Transaktion beendet ist
      const game = await manager.findOne(Game, {
        where: { id: gameId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!game) throw new NotFoundException(`Game ${gameId} not found`);
      if (game.status !== GameStatus.IN_PROGRESS) {
        throw new BadRequestException('Game is not in progress');
      }

      // ── Schritt 2: Spieler SEPARAT laden (ohne Lock, innerhalb der Transaktion) ──
      // Wir laden sie über manager.find() statt this.playerRepo.find(),
      // damit die Abfrage INNERHALB der Transaktion läuft.
      const players = await manager.find(GamePlayer, {
        where: { gameId },
        order: { turnOrder: 'ASC' },
      });
      if (players.length === 0) {
        throw new BadRequestException('No players found for this game');
      }

      // ── Schritt 3: Aktuelle Karte und aktuellen Spieler bestimmen ──
      const { orderedCards, totalPlayable } = await this.getOrderedCards(game);
      const card = orderedCards[game.currentCardIndex];
      if (!card)
        throw new BadRequestException(
          'Karte nicht gefunden – Spiel möglicherweise bereits beendet',
        );

      // Modulo-Operator für Rundlauf: Spieler 0, 1, 2, 0, 1, 2, ...
      const currentPlayer = players[game.currentCardIndex % players.length];

      // ── Schritt 4: Ergebnis bestimmen ──
      // Bei Multiple-Choice-Karten: Automatische Validierung anhand des chosenIndex
      // Das Frontend schickt den Index der gewählten Antwort, und wir prüfen
      // ob er mit dem correctIndex auf der Karte übereinstimmt.
      let result = dto.result;
      if (
        card.type === CardType.MULTIPLE_CHOICE &&
        dto.chosenIndex !== undefined
      ) {
        result =
          dto.chosenIndex === card.correctIndex
            ? TurnResult.CORRECT
            : TurnResult.WRONG;
      }

      // ── Schritt 5: Spielzug (Turn) in der Datenbank speichern ──
      // Dokumentiert: Welcher Spieler hat welche Karte wie beantwortet?
      const turn = manager.create(GameTurn, {
        gameId,
        gamePlayerId: currentPlayer.id,
        cardId: card.id,
        result,
      });
      await manager.save(turn);

      // ── Schritt 6: Spieler-Score aktualisieren ──
      // Richtig: +1 Punkt, Falsch: -1 Punkt, Skip: keine Änderung
      if (result === TurnResult.CORRECT) currentPlayer.score += 1;
      else if (result === TurnResult.WRONG) currentPlayer.score -= 1;
      await manager.save(currentPlayer);

      // ── Schritt 7: Lernfortschritt aktualisieren (nur für registrierte User) ──
      // Quick-Play-Spieler haben keine userId → kein Fortschritt-Tracking
      const userId = currentPlayer.userId;
      let newCardLevel = 1;
      if (userId) {
        const levelDelta = result === TurnResult.CORRECT ? 1 : -1;
        newCardLevel = await this.upsertProgress(
          manager,
          userId,
          card.id,
          levelDelta,
        );
      }

      // ── Schritt 8: Zur nächsten Karte vorrücken ──
      // Auch bei "skip" wird vorgerückt (im Gegensatz zu manchen Quiz-Apps)
      game.currentCardIndex += 1;

      // ── Schritt 9: Prüfen ob das Spiel beendet ist ──
      let isFinished = false;
      if (game.currentCardIndex >= totalPlayable) {
        game.status = GameStatus.FINISHED;
        game.finishedAt = new Date();
        isFinished = true;
      }
      await manager.save(game);

      // Alles wird zurückgegeben → Transaktion wird automatisch committed
      return { turn, game, isFinished, newCardLevel };
    });
  }

  /**
   * ERGEBNIS ABRUFEN — GET /games/:id/results
   *
   * Gibt den Gewinner und die Rangliste zurück (sortiert nach Score, absteigend).
   * Kann erst aufgerufen werden, wenn das Spiel beendet ist.
   */
  async getResults(gameId: string): Promise<{
    winner: GamePlayer;
    ranking: GamePlayer[];
  }> {
    const game = await this.gameRepo.findOne({
      where: { id: gameId },
      relations: ['players'],
    });
    if (!game) throw new NotFoundException(`Game ${gameId} not found`);
    if (game.status !== GameStatus.FINISHED) {
      throw new BadRequestException('Game is not finished yet');
    }

    // Spieler nach Score sortieren (höchster Score zuerst)
    const ranking = [...game.players].sort((a, b) => b.score - a.score);
    return { winner: ranking[0], ranking };
  }

  /**
   * LERNFORTSCHRITT ABRUFEN — GET /games/progress/:listId
   *
   * Gibt den Lernfortschritt eines Users für alle Karten einer Liste zurück.
   *
   * Nutzt den QueryBuilder statt des einfachen repo.find(), weil wir eine
   * IN-Clause brauchen (cardId IN (:...cardIds)). Der QueryBuilder erlaubt
   * komplexere SQL-Abfragen als die einfachen Repository-Methoden.
   */
  async getListProgress(
    userId: string,
    cardListId: string,
  ): Promise<{ cardId: string; level: number }[]> {
    // Erst alle Karten-IDs der Liste holen
    const cards = await this.cardRepo.find({
      where: { cardListId },
      select: ['id'], // Nur die ID laden (Performance-Optimierung)
    });
    const cardIds = cards.map((c) => c.id);
    if (cardIds.length === 0) return [];

    // Dann den Fortschritt für diese Karten laden
    // createQueryBuilder() erlaubt komplexere Abfragen als find()
    const rows = await this.progressRepo
      .createQueryBuilder('cp') // 'cp' = Alias für die Tabelle in der Query
      .where('cp.userId = :userId', { userId })
      .andWhere('cp.cardId IN (:...cardIds)', { cardIds }) // :...cardIds wird zu IN ($1, $2, $3, ...)
      .select(['cp.cardId', 'cp.level'])
      .getMany();

    return rows.map((r) => ({ cardId: r.cardId, level: r.level }));
  }

  // ─── Private Hilfsmethoden ──────────────────────────────────────────────────

  /**
   * KARTEN IN DER GESPEICHERTEN REIHENFOLGE LADEN
   *
   * Wenn das Spiel gestartet wird (start()), wird die Kartenreihenfolge als
   * Array von UUIDs in game.cardOrder gespeichert (JSONB-Spalte).
   *
   * Diese Methode lädt die Karten und bringt sie in die gespeicherte Reihenfolge.
   *
   * FALLBACK: Für ältere Spiele ohne gespeicherte cardOrder wird ein
   * deterministischer Shuffle (basierend auf der Game-ID als Seed) verwendet.
   * Deterministisch = gleiche Eingabe → gleiches Ergebnis, sodass alle
   * Clients die gleiche Reihenfolge sehen.
   */
  private async getOrderedCards(
    game: Game,
  ): Promise<{ orderedCards: Card[]; totalPlayable: number }> {
    if (game.cardOrder && game.cardOrder.length > 0) {
      // Standard-Pfad: Karten nach gespeicherter Reihenfolge sortieren
      const allCards = await this.cardRepo.find({
        where: { cardListId: game.cardListId! },
      });
      // Map für schnellen Zugriff: cardId → Card-Objekt
      const cardMap = new Map(allCards.map((c) => [c.id, c]));
      // Karten in der Reihenfolge von cardOrder anordnen
      const orderedCards = game.cardOrder
        .map((id) => cardMap.get(id))
        .filter((c): c is Card => !!c); // Karten rausfiltern die evtl. gelöscht wurden
      return { orderedCards, totalPlayable: orderedCards.length };
    }

    // ── Fallback: Deterministischer Shuffle (für Legacy-Spiele) ──
    // Statt Math.random() verwenden wir die Game-ID als Seed,
    // damit jeder Client die exakt gleiche Reihenfolge berechnet.
    const cards = await this.cardRepo.find({
      where: { cardListId: game.cardListId! },
      order: { position: 'ASC' },
    });
    const seeded = [...cards];
    // Game-ID (UUID) in eine Zahl umwandeln (Summe der Char-Codes)
    let seed = game.id
      .replace(/-/g, '')
      .split('')
      .reduce((acc, c) => acc + c.charCodeAt(0), 0);
    // Linear Congruential Generator (LCG) — einfacher Pseudo-Zufallsgenerator
    // Gleicher Seed → gleiche Sequenz → deterministische Reihenfolge
    for (let i = seeded.length - 1; i > 0; i--) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const j = seed % (i + 1);
      [seeded[i], seeded[j]] = [seeded[j], seeded[i]];
    }
    // Karten-Verteilungs-Algorithmus: Gleichmäßig auf Spieler verteilen
    const playerCount = game.players.length || 1;
    const totalPlayable = Math.floor(seeded.length / playerCount) * playerCount;
    return { orderedCards: seeded, totalPlayable };
  }

  /**
   * LERNFORTSCHRITT AKTUALISIEREN (Upsert-Pattern)
   *
   * "Upsert" = Update + Insert: Wenn ein Fortschritt-Eintrag existiert,
   * wird er aktualisiert. Wenn nicht, wird ein neuer erstellt.
   *
   * Das Level wird mit Math.max/Math.min auf [MIN_LEVEL, MAX_LEVEL] begrenzt
   * (aktuell 1-10). Man kann also nicht unter 1 fallen oder über 10 steigen.
   *
   * WICHTIG: Nutzt den manager (EntityManager) statt this.progressRepo,
   * damit die Operation INNERHALB der Transaktion von submitAnswer() läuft.
   * Wenn submitAnswer() fehlschlägt, wird auch diese Änderung zurückgerollt.
   *
   * @param manager  - EntityManager innerhalb der aktiven Transaktion
   * @param userId   - ID des registrierten Benutzers
   * @param cardId   - ID der Karte
   * @param delta    - +1 (richtig) oder -1 (falsch)
   * @returns Das neue Level nach der Aktualisierung
   */
  private async upsertProgress(
    manager: EntityManager,
    userId: string,
    cardId: string,
    delta: number,
  ): Promise<number> {
    let row = await manager.findOne(CardProgress, {
      where: { userId, cardId },
    });
    if (!row) {
      // Erster Fortschritt für diese Karte → neuen Eintrag erstellen
      row = manager.create(CardProgress, { userId, cardId, level: 1 });
    }
    // Level anpassen und auf gültigen Bereich begrenzen (Clamping)
    row.level = Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, row.level + delta));
    await manager.save(row);
    return row.level;
  }
}

export { shuffle };
