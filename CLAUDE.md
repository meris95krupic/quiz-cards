# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

Monorepo with two packages:

- `quiz-cards-api/` — NestJS REST API (TypeScript, PostgreSQL, TypeORM)
- `quiz-cards-ui/` — Vite + React SPA (TypeScript, SCSS)

Task plans: `.claude/tasks/`
- `init-api-task.md` – overall overview and architecture decisions
- `be-tasks.md` – backend task plan with all phases
- `fe-tasks.md` – frontend task plan

## Backend Commands (`quiz-cards-api/`)

```bash
npm run start:dev     # Start with hot-reload (port 3000)
npm run build         # Compile TypeScript
npm run test          # Run unit tests
npm run test:cov      # Coverage report
npm run lint          # ESLint with auto-fix
npm run seed          # Seed DB with 2 sample card lists (requires DB running)
```

## Frontend Commands (`quiz-cards-ui/`)

```bash
npm run dev           # Dev server (port 5173)
npm run build         # Production build
npm run lint          # ESLint
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
│   ├── guards/       JwtAuthGuard, AdminGuard
│   ├── interceptors/ LoggingInterceptor (request timing)
│   └── decorators/   @CurrentUser()
└── modules/
    ├── auth/         POST /auth/register (invite-code gated), /auth/login, GET /auth/me
    ├── users/        CRUD /users (JWT protected)
    ├── card-lists/   GET/POST/DELETE /card-lists (JWT required; lists are per-user)
    │                 POST /card-lists/import (JSON import)
    ├── cards/        Card entity only (no separate controller)
    ├── card-progress Card learning level 1–10 per user per card
    ├── games/        Full game flow:
    │                   POST /games, GET /games/:id/state (polling)
    │                   POST /games/:id/players, POST /games/:id/start
    │                   POST /games/:id/answer, GET /games/:id/results
    │                   GET /games/progress/:listId (JWT)
    ├── shop/         POST /shop/submit/:listId (JWT), GET /shop (public)
    │                 GET /shop/pending (admin), POST /shop/:id/approve|reject (admin)
    │                 POST /shop/:id/import (JWT) — copies list to user's own lists
    └── seeds/        seed.ts – run with npm run seed
```

### Key Design Decisions
- **Online multiplayer via polling**: clients poll `GET /games/:id/state` every 2.5s; no WebSockets. Each player gets a `sessionToken` (UUID) on join stored in `sessionStorage` to identify themselves.
- **Local multiplayer**: gameStore handles everything client-side; no API calls during play.
- **Two player modes**: Quick play (name + avatarId only) and registered user (JWT, links `userId` for learning progress).
- **Card ownership**: `card_lists.user_id` — `GET /card-lists` requires JWT and only returns the authenticated user's lists.
- **`TypeORM synchronize: true`** in dev/test, disabled in production.
- **Card distribution**: `Math.floor(cards / players) * players` cards played; remainder skipped. `cardOrder` (jsonb array of card IDs) set at game start.
- **Skip mechanic**: `result = 'skip'` → score unchanged, card index advances (next player's turn).
- **Learning progress**: correct +1, wrong −1, clamped to [1, 10]. Only tracked for registered users (`userId` set on `game_player`).
- **Admin**: `user.email === ADMIN_EMAIL` env var; admin can approve/reject shop submissions.
- **submitAnswer transaction**: `pessimistic_write` lock on Game row only (no relations in the lock query — FOR UPDATE + JOIN fails in PostgreSQL). Players fetched separately in same transaction.

### DB Entities
`users`, `card_lists` (userId), `cards`, `card_progress`, `games` (cardOrder jsonb), `game_players` (sessionToken), `game_turns`, `shop_submissions`

### Environment Variables
See `.env.example`. Required: `DATABASE_*`, `JWT_SECRET`, `INVITE_CODE`. Optional: `ADMIN_EMAIL`, `SENTRY_DSN`, `CORS_ORIGIN`.

### Running locally
Requires PostgreSQL. Create a DB named `quiz_cards`, then:
```bash
cp .env.example .env   # fill in DB credentials + INVITE_CODE
npm install
npm run start:dev      # TypeORM auto-creates tables (synchronize: true in dev)
npm run seed           # optional: load sample data
```
Swagger UI: `http://localhost:3000/api/docs`

## Architecture (Frontend)

### Tech Stack
Vite + React (TypeScript), SCSS Modules, Zustand, Axios, React Router v6 (HashRouter for Vercel SPA).

### Key Files
```
src/
├── App.tsx             HashRouter + all routes; calls loadUser() on mount if token exists
├── types/index.ts      All TypeScript interfaces
├── api/                client.ts (axios, VITE_API_URL), auth.ts, cardLists.ts, games.ts, shop.ts
├── stores/             authStore.ts (loadUser on reload), playersStore.ts, gameStore.ts
├── utils/              localStorage.ts, uuid.ts, color.ts, avatars.ts
└── pages/
    ├── Home            QuickPlayer management + player selection
    ├── Login / Register JWT auth (Register requires INVITE_CODE)
    ├── Lobby           List selector, card count picker, local/online game start
    │                   handleStartOnlineGame: pre-adds all players, stores sessions
    ├── Game            Local card game (QA flip + Multiple Choice)
    ├── Results         Local (gameStore) + Online (GET /games/:id/results) ranking
    ├── Room            Online multiplayer room (polling /games/:id/state every 2.5s)
    │                   Multi-session: myTokens Set covers all pre-added players on host device
    └── Shop            Browse/import approved lists; admin approve/reject tab
```

### Routes
| Path | Component |
|---|---|
| `/` | Home |
| `/login` | Login |
| `/register` | Register |
| `/lobby` | Lobby |
| `/game/:id` | Game (local) |
| `/game/:id/results` | Results (local + online) |
| `/room/:id` | Room (online multiplayer) |
| `/shop` | Shop |

### State Management
- **authStore**: `user`, `token`, `isAuthenticated`; `loadUser()` fetches `/auth/me` on page reload when token exists but `user` is null
- **playersStore**: quick players list + selected IDs (persisted to localStorage)
- **gameStore**: local game state (cards, scores, progress); `isLocalMode` flag distinguishes local from online

### Online Multiplayer Flow
1. Host selects list + players in Lobby → clicks "Online spielen"
2. `handleStartOnlineGame`: creates game, pre-adds all players (auth user with `userId`, quick players without), stores all `sessionToken`s in `sessionStorage` as `room_sessions_<gameId>`
3. Host navigates to `/room/:id` — skips join form, goes straight to lobby
4. Other devices open the link → show join form → get their own `sessionToken` stored as `room_session_<gameId>`
5. Host clicks "Spiel starten" → `POST /games/:id/start`
6. All devices poll `/games/:id/state` every 2.5s
7. Device whose `sessionToken` matches `currentPlayer.sessionToken` shows card + answer buttons; others show waiting screen
8. After last card: both devices navigate to `/game/:id/results`
