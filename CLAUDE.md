# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

Monorepo with two packages:

- `quiz-cards-api/` — NestJS REST API (TypeScript, PostgreSQL, TypeORM)
- `quiz-cards-ui/` — Vite + React SPA (TypeScript, SCSS) – not yet initialized

Task plans: `.claude/tasks/`
- `init-api-task.md` – overall overview and architecture decisions
- `be-tasks.md` – backend task plan with all phases
- `fe-tasks.md` – frontend task plan

## Backend Commands (`quiz-cards-api/`)

```bash
npm run start:dev     # Start with hot-reload
npm run build         # Compile TypeScript
npm run test          # Run unit tests
npm run test:cov      # Coverage report
npm run lint          # ESLint with auto-fix
npm run seed          # Seed DB with 2 sample card lists (requires DB running)
```

## Architecture (Backend)

### Tech Stack
NestJS (Express), TypeScript, TypeORM, PostgreSQL, JWT Auth (passport-jwt + bcrypt), Helmet, CORS, Throttler, Swagger, Sentry, class-validator.

### Module Structure
```
src/
├── config/           configuration.ts (typed config), validation.ts (Joi schema)
├── common/
│   ├── filters/      AllExceptionsFilter (global)
│   ├── guards/       JwtAuthGuard
│   ├── interceptors/ LoggingInterceptor (request timing)
│   └── decorators/   @CurrentUser()
└── modules/
    ├── auth/         POST /auth/register, /auth/login, GET /auth/me
    ├── users/        CRUD /users (JWT protected)
    ├── card-lists/   GET/POST/DELETE /card-lists (JSON import at POST /card-lists/import)
    ├── cards/        Card entity only (no separate controller)
    ├── games/        Full game flow /games (create, add players, start, current-card, answer, results)
    └── seeds/        seed.ts – run with npm run seed
```

### Key Design Decisions
- **One device per game** – no WebSockets, no real-time sync needed
- **Two player modes**: Modus A (localStorage only, name + avatarId stored in `game_players`) and Modus B (JWT auth, registered `users`)
- **`TypeORM synchronize: true`** in dev/test, disabled in production
- **Card distribution**: `Math.floor(cards / players) * players` cards are played; remainder skipped. Seeded shuffle uses gameId as entropy for deterministic ordering.
- **Skip mechanic**: `result = 'skip'` → score unchanged, card index does NOT advance, next player takes same card (via modulo of `currentCardIndex % playerCount`)
- **bgColor**: Both `card_lists.bg_color` and `cards.bg_color` are nullable; card overrides list; FE falls back to gradient

### DB Entities
`users`, `card_lists`, `cards`, `games`, `game_players`, `game_turns`

### Environment Variables
See `.env.example`. Required: `DATABASE_*`, `JWT_SECRET`. Optional: `SENTRY_DSN`, `CORS_ORIGIN`.

### Running locally
Requires PostgreSQL. Create a DB named `quiz_cards`, then:
```bash
cp .env.example .env   # fill in DB credentials
npm install
npm run start:dev      # TypeORM auto-creates tables (synchronize: true in dev)
npm run seed           # optional: load sample data
```
Swagger UI: `http://localhost:3000/api/docs`
