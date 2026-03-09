import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShopSubmission } from './shop-submission.entity';
import { CardList } from '../card-lists/card-list.entity';
import { Card } from '../cards/card.entity';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';

@Module({
  imports: [TypeOrmModule.forFeature([ShopSubmission, CardList, Card])],
  controllers: [ShopController],
  providers: [ShopService],
})
export class ShopModule {}
