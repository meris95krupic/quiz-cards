import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CardList } from './card-list.entity';
import { Card, CardType } from '../cards/card.entity';
import { ImportCardListDto } from './dto/import-card-list.dto';

@Injectable()
export class CardListsService {
  constructor(
    @InjectRepository(CardList)
    private readonly cardListRepo: Repository<CardList>,
    private readonly dataSource: DataSource,
  ) {}

  findAll(userId: string): Promise<CardList[]> {
    return this.cardListRepo.find({
      where: { userId },
      relations: ['cards'],
      order: { createdAt: 'DESC', cards: { position: 'ASC' } } as never,
    });
  }

  async findOne(id: string): Promise<CardList> {
    const list = await this.cardListRepo.findOne({
      where: { id },
      relations: ['cards'],
      order: { cards: { position: 'ASC' } } as never,
    });
    if (!list) throw new NotFoundException(`Card list ${id} not found`);
    return list;
  }

  async import(dto: ImportCardListDto, userId: string): Promise<CardList> {
    return this.dataSource.transaction(async (manager) => {
      const list = manager.create(CardList, {
        userId,
        title: dto.title,
        description: dto.description ?? null,
        bgColor: dto.bgColor ?? null,
      });
      await manager.save(list);

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
          cardListId: list.id,
          type: c.type,
          front: c.front,
          back: c.back,
          options: c.options ?? null,
          correctIndex: c.correctIndex ?? null,
          position: idx,
          bgColor: c.bgColor ?? null,
        });
      });

      await manager.save(cards);
      list.cards = cards;
      return list;
    });
  }

  async remove(id: string): Promise<void> {
    const result = await this.cardListRepo.delete(id);
    if (result.affected === 0)
      throw new NotFoundException(`Card list ${id} not found`);
  }
}
