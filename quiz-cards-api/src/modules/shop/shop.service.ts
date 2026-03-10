import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ShopSubmission } from './shop-submission.entity';
import { CardList } from '../card-lists/card-list.entity';
import { Card } from '../cards/card.entity';
import { User } from '../users/user.entity';

@Injectable()
export class ShopService {
  private readonly adminEmail: string;

  constructor(
    @InjectRepository(ShopSubmission)
    private readonly submissionRepo: Repository<ShopSubmission>,
    @InjectRepository(CardList)
    private readonly cardListRepo: Repository<CardList>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {
    this.adminEmail =
      this.config.get<string>('adminEmail') ?? 'meris-k@hotmail.com';
  }

  isAdmin(user: User): boolean {
    return user.email === this.adminEmail;
  }

  async submit(cardListId: string, user: User): Promise<ShopSubmission> {
    const list = await this.cardListRepo.findOne({ where: { id: cardListId } });
    if (!list) throw new NotFoundException('Kartenliste nicht gefunden');

    const existing = await this.submissionRepo.findOne({
      where: { cardListId, status: 'pending' },
    });
    if (existing)
      throw new ConflictException('Diese Liste wurde bereits eingereicht');

    const isAdmin = this.isAdmin(user);
    const submission = this.submissionRepo.create({
      cardListId,
      submittedBy: user.id,
      status: isAdmin ? 'approved' : 'pending',
      reviewedAt: isAdmin ? new Date() : null,
    });

    return this.submissionRepo.save(submission);
  }

  findApproved(): Promise<ShopSubmission[]> {
    return this.submissionRepo.find({
      where: { status: 'approved' },
      order: { submittedAt: 'DESC' },
    });
  }

  findPending(user: User): Promise<ShopSubmission[]> {
    if (!this.isAdmin(user)) throw new ForbiddenException();
    return this.submissionRepo.find({
      where: { status: 'pending' },
      order: { submittedAt: 'ASC' },
    });
  }

  async approve(id: string, user: User): Promise<ShopSubmission> {
    if (!this.isAdmin(user)) throw new ForbiddenException();
    const sub = await this.submissionRepo.findOne({ where: { id } });
    if (!sub) throw new NotFoundException();
    sub.status = 'approved';
    sub.reviewedAt = new Date();
    return this.submissionRepo.save(sub);
  }

  async reject(id: string, user: User): Promise<ShopSubmission> {
    if (!this.isAdmin(user)) throw new ForbiddenException();
    const sub = await this.submissionRepo.findOne({ where: { id } });
    if (!sub) throw new NotFoundException();
    sub.status = 'rejected';
    sub.reviewedAt = new Date();
    return this.submissionRepo.save(sub);
  }

  async remove(id: string, user: User): Promise<void> {
    const sub = await this.submissionRepo.findOne({ where: { id } });
    if (!sub) throw new NotFoundException();
    if (!this.isAdmin(user) && sub.submittedBy !== user.id)
      throw new ForbiddenException();
    await this.submissionRepo.delete(id);
  }

  async importToMyLists(submissionId: string, user: User): Promise<CardList> {
    const sub = await this.submissionRepo.findOne({
      where: { id: submissionId, status: 'approved' },
      relations: ['cardList', 'cardList.cards'],
    });
    if (!sub)
      throw new NotFoundException(
        'Shop-Eintrag nicht gefunden oder nicht genehmigt',
      );

    const original = sub.cardList;

    return this.dataSource.transaction(async (manager) => {
      const copy = manager.create(CardList, {
        userId: user.id,
        title: original.title,
        description: original.description,
        bgColor: original.bgColor,
      });
      await manager.save(copy);

      const cards = (original.cards ?? []).map((c) =>
        manager.create(Card, {
          cardListId: copy.id,
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
      copy.cards = cards;
      return copy;
    });
  }
}
