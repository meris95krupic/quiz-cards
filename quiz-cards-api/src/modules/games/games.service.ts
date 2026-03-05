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
import { CardProgress, MAX_LEVEL, MIN_LEVEL } from '../cards/card-progress.entity';
import { CreateGameDto } from './dto/create-game.dto';
import { AddPlayerDto } from './dto/add-player.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Selects `count` unique cards weighted by learning level.
 * Level 1 → weight 10 (often), Level 10 → weight 1 (rarely).
 */
function selectWeighted(
  cards: Card[],
  progressMap: Map<string, number>,
  count: number,
): Card[] {
  const pool: Card[] = [];
  for (const card of cards) {
    const level = progressMap.get(card.id) ?? 1;
    const weight = MAX_LEVEL + 1 - level; // level 1→10, level 10→1
    for (let i = 0; i < weight; i++) pool.push(card);
  }

  const shuffled = shuffle(pool);
  const seen = new Set<string>();
  const selected: Card[] = [];
  for (const card of shuffled) {
    if (!seen.has(card.id)) {
      seen.add(card.id);
      selected.push(card);
      if (selected.length >= count) break;
    }
  }

  // Fill up if weighted pool didn't have enough unique cards
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

@Injectable()
export class GamesService {
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

  async create(dto: CreateGameDto): Promise<Game> {
    const cardList = await this.cardListRepo.findOne({
      where: { id: dto.cardListId },
    });
    if (!cardList) throw new NotFoundException('Card list not found');

    const game = this.gameRepo.create({
      cardListId: dto.cardListId,
      status: GameStatus.LOBBY,
      currentCardIndex: 0,
      cardOrder: null,
    });
    return this.gameRepo.save(game);
  }

  async findOne(id: string): Promise<Game> {
    const game = await this.gameRepo.findOne({
      where: { id },
      relations: ['players', 'cardList'],
    });
    if (!game) throw new NotFoundException(`Game ${id} not found`);
    return game;
  }

  async addPlayer(gameId: string, dto: AddPlayerDto): Promise<GamePlayer> {
    const game = await this.gameRepo.findOne({
      where: { id: gameId },
      relations: ['players'],
    });
    if (!game) throw new NotFoundException(`Game ${gameId} not found`);
    if (game.status !== GameStatus.LOBBY) {
      throw new BadRequestException('Cannot add players after game has started');
    }

    const player = this.playerRepo.create({
      gameId,
      userId: dto.userId ?? null,
      name: dto.name,
      avatarId: dto.avatarId,
      score: 0,
      turnOrder: game.players.length,
    });
    return this.playerRepo.save(player);
  }

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

    const cards = await this.cardRepo.find({
      where: { cardListId: game.cardListId! },
      order: { position: 'ASC' },
    });

    const playerCount = game.players.length;
    const count = Math.floor(cards.length / playerCount) * playerCount;

    // Solo play with a registered user → weighted selection based on progress
    const soloUserId =
      playerCount === 1 ? (game.players[0].userId ?? null) : null;

    let selected: Card[];
    if (soloUserId) {
      const progressRows = await this.progressRepo.find({
        where: { userId: soloUserId },
        select: ['cardId', 'level'],
      });
      const progressMap = new Map(progressRows.map((p) => [p.cardId, p.level]));
      selected = selectWeighted(cards, progressMap, count);
    } else {
      selected = shuffle(cards).slice(0, count);
    }

    game.cardOrder = selected.map((c) => c.id);
    game.status = GameStatus.IN_PROGRESS;
    game.currentCardIndex = 0;
    return this.gameRepo.save(game);
  }

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

    // Include card level for solo user
    const soloUserId = players.length === 1 ? (players[0].userId ?? null) : null;
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

  async submitAnswer(
    gameId: string,
    dto: SubmitAnswerDto,
  ): Promise<{
    turn: GameTurn;
    game: Game;
    isFinished: boolean;
    newCardLevel: number;
  }> {
    return this.dataSource.transaction(async (manager) => {
      const game = await manager.findOne(Game, {
        where: { id: gameId },
        relations: ['players'],
        lock: { mode: 'pessimistic_write' },
      });
      if (!game) throw new NotFoundException(`Game ${gameId} not found`);
      if (game.status !== GameStatus.IN_PROGRESS) {
        throw new BadRequestException('Game is not in progress');
      }

      const { orderedCards, totalPlayable } = await this.getOrderedCards(game);
      const card = orderedCards[game.currentCardIndex];
      const players = [...game.players].sort((a, b) => a.turnOrder - b.turnOrder);
      const currentPlayer = players[game.currentCardIndex % players.length];

      // For multiple_choice: auto-validate if chosenIndex provided
      let result = dto.result;
      if (card.type === CardType.MULTIPLE_CHOICE && dto.chosenIndex !== undefined) {
        result =
          dto.chosenIndex === card.correctIndex
            ? TurnResult.CORRECT
            : TurnResult.WRONG;
      }

      const turn = manager.create(GameTurn, {
        gameId,
        gamePlayerId: currentPlayer.id,
        cardId: card.id,
        result,
      });
      await manager.save(turn);

      // Update score
      if (result === TurnResult.CORRECT) currentPlayer.score += 1;
      else if (result === TurnResult.WRONG) currentPlayer.score -= 1;
      await manager.save(currentPlayer);

      // Update learning progress for registered user
      const userId = currentPlayer.userId;
      let newCardLevel = 1;
      if (userId) {
        const levelDelta = result === TurnResult.CORRECT ? 1 : -1;
        newCardLevel = await this.upsertProgress(manager, userId, card.id, levelDelta);
      }

      // Advance card index (skip = card stays in API, advance anyway per FE behaviour)
      game.currentCardIndex += 1;

      let isFinished = false;
      if (game.currentCardIndex >= totalPlayable) {
        game.status = GameStatus.FINISHED;
        game.finishedAt = new Date();
        isFinished = true;
      }
      await manager.save(game);

      return { turn, game, isFinished, newCardLevel };
    });
  }

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

    const ranking = [...game.players].sort((a, b) => b.score - a.score);
    return { winner: ranking[0], ranking };
  }

  /** Returns the card progress for a user across an entire card list. */
  async getListProgress(
    userId: string,
    cardListId: string,
  ): Promise<{ cardId: string; level: number }[]> {
    const cards = await this.cardRepo.find({
      where: { cardListId },
      select: ['id'],
    });
    const cardIds = cards.map((c) => c.id);
    if (cardIds.length === 0) return [];

    const rows = await this.progressRepo
      .createQueryBuilder('cp')
      .where('cp.userId = :userId', { userId })
      .andWhere('cp.cardId IN (:...cardIds)', { cardIds })
      .select(['cp.cardId', 'cp.level'])
      .getMany();

    return rows.map((r) => ({ cardId: r.cardId, level: r.level }));
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Returns ordered cards for a game.
   * Uses stored cardOrder (set at start) if available, else deterministic shuffle.
   */
  private async getOrderedCards(
    game: Game,
  ): Promise<{ orderedCards: Card[]; totalPlayable: number }> {
    if (game.cardOrder && game.cardOrder.length > 0) {
      const allCards = await this.cardRepo.find({
        where: { cardListId: game.cardListId! },
      });
      const cardMap = new Map(allCards.map((c) => [c.id, c]));
      const orderedCards = game.cardOrder
        .map((id) => cardMap.get(id))
        .filter((c): c is Card => !!c);
      return { orderedCards, totalPlayable: orderedCards.length };
    }

    // Fallback: seeded deterministic shuffle (legacy / quick-start)
    const cards = await this.cardRepo.find({
      where: { cardListId: game.cardListId! },
      order: { position: 'ASC' },
    });
    const seeded = [...cards];
    let seed = game.id
      .replace(/-/g, '')
      .split('')
      .reduce((acc, c) => acc + c.charCodeAt(0), 0);
    for (let i = seeded.length - 1; i > 0; i--) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const j = seed % (i + 1);
      [seeded[i], seeded[j]] = [seeded[j], seeded[i]];
    }
    const playerCount = game.players.length || 1;
    const totalPlayable = Math.floor(seeded.length / playerCount) * playerCount;
    return { orderedCards: seeded, totalPlayable };
  }

  /** Upsert card_progress and clamp level to [MIN_LEVEL, MAX_LEVEL]. */
  private async upsertProgress(
    manager: EntityManager,
    userId: string,
    cardId: string,
    delta: number,
  ): Promise<number> {
    let row = await manager.findOne(CardProgress, { where: { userId, cardId } });
    if (!row) {
      row = manager.create(CardProgress, { userId, cardId, level: 1 });
    }
    row.level = Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, row.level + delta));
    await manager.save(row);
    return row.level;
  }
}

export { shuffle };
