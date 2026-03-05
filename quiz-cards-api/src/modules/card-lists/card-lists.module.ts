import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardListsService } from './card-lists.service';
import { CardListsController } from './card-lists.controller';
import { CardList } from './card-list.entity';
import { Card } from '../cards/card.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CardList, Card])],
  providers: [CardListsService],
  controllers: [CardListsController],
  exports: [CardListsService],
})
export class CardListsModule {}
