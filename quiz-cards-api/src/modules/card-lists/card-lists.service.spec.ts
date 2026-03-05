import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CardListsService } from './card-lists.service';
import { CardList } from './card-list.entity';
import { Card, CardType } from '../cards/card.entity';

const mockList: CardList = {
  id: 'list-uuid',
  title: 'Test List',
  description: null,
  bgColor: null,
  createdAt: new Date(),
  cards: [],
};

describe('CardListsService', () => {
  let service: CardListsService;
  const cardListRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const dataSource = {
    transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardListsService,
        { provide: getRepositoryToken(CardList), useValue: cardListRepo },
        { provide: getRepositoryToken(Card), useValue: {} },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = module.get<CardListsService>(CardListsService);
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('throws NotFoundException when list not found', async () => {
      cardListRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns list with cards', async () => {
      cardListRepo.findOne.mockResolvedValue(mockList);
      const result = await service.findOne('list-uuid');
      expect(result).toEqual(mockList);
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when list not found', async () => {
      cardListRepo.delete.mockResolvedValue({ affected: 0 });
      await expect(service.remove('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deletes successfully', async () => {
      cardListRepo.delete.mockResolvedValue({ affected: 1 });
      await expect(service.remove('list-uuid')).resolves.toBeUndefined();
    });
  });

  describe('import – validation', () => {
    it('rejects multiple_choice card without options via transaction', async () => {
      dataSource.transaction.mockImplementation(
        (cb: (manager: unknown) => Promise<unknown>) => {
          const manager = {
            create: jest.fn((_Entity: unknown, data: unknown) => ({
              ...(data as object),
            })),
            save: jest.fn((entity: unknown) => Promise.resolve(entity)),
          };
          return cb(manager);
        },
      );

      await expect(
        service.import({
          title: 'Test',
          cards: [
            {
              type: CardType.MULTIPLE_CHOICE,
              front: 'Question?',
              back: 'Answer',
              // missing options and correctIndex
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
