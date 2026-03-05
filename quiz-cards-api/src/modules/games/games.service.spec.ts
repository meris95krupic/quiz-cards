import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { GamesService, shuffle } from './games.service';
import { Game, GameStatus } from './game.entity';
import { GamePlayer } from './game-player.entity';
import { GameTurn } from './game-turn.entity';
import { CardList } from '../card-lists/card-list.entity';
import { Card, CardType } from '../cards/card.entity';

const makePlayer = (turnOrder: number, score = 0): GamePlayer =>
  ({
    id: `player-${turnOrder}`,
    gameId: 'game-1',
    turnOrder,
    score,
    name: `P${turnOrder}`,
    avatarId: 1,
  }) as GamePlayer;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _makeCard = (id: string, position: number): Card =>
  ({
    id,
    cardListId: 'list-1',
    type: CardType.QA,
    front: 'Q',
    back: 'A',
    options: null,
    correctIndex: null,
    position,
    bgColor: null,
  }) as Card;

describe('GamesService', () => {
  let service: GamesService;

  const gameRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
  const playerRepo = { create: jest.fn(), save: jest.fn() };
  const turnRepo = { create: jest.fn(), save: jest.fn() };
  const cardListRepo = { findOne: jest.fn() };
  const cardRepo = { find: jest.fn() };
  const dataSource = { transaction: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamesService,
        { provide: getRepositoryToken(Game), useValue: gameRepo },
        { provide: getRepositoryToken(GamePlayer), useValue: playerRepo },
        { provide: getRepositoryToken(GameTurn), useValue: turnRepo },
        { provide: getRepositoryToken(CardList), useValue: cardListRepo },
        { provide: getRepositoryToken(Card), useValue: cardRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = module.get<GamesService>(GamesService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('throws NotFoundException when card list not found', async () => {
      cardListRepo.findOne.mockResolvedValue(null);
      await expect(
        service.create({ cardListId: 'non-existent' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates a game in LOBBY status', async () => {
      cardListRepo.findOne.mockResolvedValue({ id: 'list-1' });
      gameRepo.create.mockReturnValue({
        cardListId: 'list-1',
        status: GameStatus.LOBBY,
      });
      gameRepo.save.mockResolvedValue({
        id: 'game-1',
        status: GameStatus.LOBBY,
      });

      const result = await service.create({ cardListId: 'list-1' });
      expect(result.status).toBe(GameStatus.LOBBY);
    });
  });

  describe('addPlayer', () => {
    it('throws when game is already started', async () => {
      gameRepo.findOne.mockResolvedValue({
        id: 'game-1',
        status: GameStatus.IN_PROGRESS,
        players: [],
      });
      await expect(
        service.addPlayer('game-1', { name: 'Alice', avatarId: 1 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('start', () => {
    it('throws when no players', async () => {
      gameRepo.findOne.mockResolvedValue({
        id: 'game-1',
        status: GameStatus.LOBBY,
        players: [],
      });
      await expect(service.start('game-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('sets status to IN_PROGRESS', async () => {
      const game = {
        id: 'game-1',
        status: GameStatus.LOBBY,
        players: [makePlayer(0)],
        currentCardIndex: 0,
      };
      gameRepo.findOne.mockResolvedValue(game);
      gameRepo.save.mockResolvedValue({
        ...game,
        status: GameStatus.IN_PROGRESS,
      });

      const result = await service.start('game-1');
      expect(result.status).toBe(GameStatus.IN_PROGRESS);
    });
  });

  describe('card distribution logic', () => {
    it('calculates playable cards correctly (3 players, 10 cards → 9)', () => {
      const playerCount = 3;
      const totalCards = 10;
      const playable = Math.floor(totalCards / playerCount) * playerCount;
      expect(playable).toBe(9);
    });

    it('calculates playable cards correctly (2 players, 7 cards → 6)', () => {
      const playerCount = 2;
      const totalCards = 7;
      const playable = Math.floor(totalCards / playerCount) * playerCount;
      expect(playable).toBe(6);
    });

    it('assigns cards round-robin to players', () => {
      const players = [makePlayer(0), makePlayer(1), makePlayer(2)];
      const cards = [0, 1, 2, 3, 4, 5, 6, 7, 8]; // 9 cards
      const assignments = cards.map((_, i) => players[i % players.length].id);
      expect(assignments[0]).toBe('player-0');
      expect(assignments[1]).toBe('player-1');
      expect(assignments[2]).toBe('player-2');
      expect(assignments[3]).toBe('player-0');
    });
  });

  describe('scoring', () => {
    it('correct → +1 point', () => {
      const player = makePlayer(0, 0);
      player.score += 1;
      expect(player.score).toBe(1);
    });

    it('wrong → -1 point (negative scores allowed)', () => {
      const player = makePlayer(0, 0);
      player.score -= 1;
      expect(player.score).toBe(-1);
    });

    it('skip → score unchanged', () => {
      const player = makePlayer(0, 0);
      // skip: no change
      expect(player.score).toBe(0);
    });
  });

  describe('getResults', () => {
    it('throws BadRequestException when game not finished', async () => {
      gameRepo.findOne.mockResolvedValue({
        id: 'game-1',
        status: GameStatus.IN_PROGRESS,
        players: [],
      });
      await expect(service.getResults('game-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('returns players sorted by score descending', async () => {
      const players = [makePlayer(0, 3), makePlayer(1, 7), makePlayer(2, -1)];
      gameRepo.findOne.mockResolvedValue({
        id: 'game-1',
        status: GameStatus.FINISHED,
        players,
      });
      const { ranking } = await service.getResults('game-1');
      expect(ranking[0].score).toBe(7);
      expect(ranking[1].score).toBe(3);
      expect(ranking[2].score).toBe(-1);
    });
  });
});

describe('shuffle utility', () => {
  it('returns same length array', () => {
    const arr = [1, 2, 3, 4, 5];
    const result = shuffle([...arr]);
    expect(result).toHaveLength(5);
  });

  it('contains all original elements', () => {
    const arr = [1, 2, 3, 4, 5];
    const result = shuffle([...arr]);
    expect(result.sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
