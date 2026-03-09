import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { validationSchema } from './config/validation';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CardListsModule } from './modules/card-lists/card-lists.module';
import { GamesModule } from './modules/games/games.module';
import { User } from './modules/users/user.entity';
import { CardList } from './modules/card-lists/card-list.entity';
import { Card } from './modules/cards/card.entity';
import { Game } from './modules/games/game.entity';
import { GamePlayer } from './modules/games/game-player.entity';
import { GameTurn } from './modules/games/game-turn.entity';
import { CardProgress } from './modules/cards/card-progress.entity';
import { ShopModule } from './modules/shop/shop.module';
import { ShopSubmission } from './modules/shop/shop-submission.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.user'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.name'),
        entities: [User, CardList, Card, Game, GamePlayer, GameTurn, CardProgress, ShopSubmission],
        synchronize: config.get<string>('nodeEnv') !== 'production',
        logging: config.get<string>('nodeEnv') === 'development',
        ssl: config.get<string>('database.ssl') === 'true' ? { rejectUnauthorized: false } : false,
      }),
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 20,
      },
      {
        name: 'medium',
        ttl: 60_000,
        limit: 200,
      },
    ]),
    AuthModule,
    UsersModule,
    CardListsModule,
    GamesModule,
    ShopModule,
  ],
})
export class AppModule {}
