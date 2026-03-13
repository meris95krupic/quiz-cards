/**
 * =====================================================================
 * UsersModule — NestJS-Modul für die Benutzerverwaltung
 * =====================================================================
 *
 * Dieses Modul verwaltet die User-Entity (Registrierung, Profil, etc.).
 *
 * Aufbau:
 * - imports: TypeOrmModule registriert das User-Repository
 * - providers: UsersService enthält die Geschäftslogik
 * - controllers: UsersController definiert die REST-Endpunkte
 * - exports: UsersService wird exportiert, damit andere Module
 *   (insbesondere das AuthModule) darauf zugreifen können.
 *
 * Warum wird UsersService exportiert?
 *   Das AuthModule braucht den UsersService, um bei Login/Register
 *   User in der Datenbank zu suchen oder anzulegen. Ohne "exports"
 *   wäre der Service nur innerhalb des UsersModule verfügbar.
 *
 *   In NestJS gilt: Providers sind standardmäßig PRIVAT innerhalb
 *   ihres Moduls. Nur durch "exports" werden sie für andere Module sichtbar.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
