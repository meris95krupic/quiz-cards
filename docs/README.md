# QuizCards – Dokumentation

Multiplayer-Quizspiel für ein Gerät. Kartenlisten werden per JSON importiert, Spieler reichen das Handy reihum (wie echte Karten).

---

## Inhaltsverzeichnis

1. [Projektstruktur](#projektstruktur)
2. [Backend (quiz-cards-api)](#backend)
3. [Frontend (quiz-cards-ui)](#frontend)
4. [Spielmodi](#spielmodi)
5. [JSON-Format für Kartenlisten](#json-format)
6. [Lokales Setup](#lokales-setup)

---

## Projektstruktur

```
quiz-cards/
├── quiz-cards-api/     NestJS REST API
├── quiz-cards-ui/      Vite + React SPA
└── docs/               Diese Dokumentation
```

---

## Backend

**Tech Stack:** NestJS · TypeScript · TypeORM · PostgreSQL · JWT · bcrypt · Swagger · Helmet · Throttler

### Starten

```bash
cd quiz-cards-api
npm install
npm run start:dev       # http://localhost:3000
npm run seed            # Beispieldaten laden
npm run test            # Unit Tests
```

Swagger UI: `http://localhost:3000/api/docs`

### Umgebungsvariablen (`.env`)

| Variable | Beschreibung |
|---|---|
| `PORT` | Server-Port (Standard: 3000) |
| `DATABASE_HOST` | PostgreSQL Host |
| `DATABASE_PORT` | PostgreSQL Port (Standard: 5432) |
| `DATABASE_USER` | DB-Benutzer |
| `DATABASE_PASSWORD` | DB-Passwort (kann leer sein) |
| `DATABASE_NAME` | Datenbankname (`quiz_cards`) |
| `JWT_SECRET` | Geheimschlüssel für JWT (min. 16 Zeichen) |
| `JWT_EXPIRES_IN` | Token-Laufzeit (Standard: `7d`) |
| `CORS_ORIGIN` | Erlaubter FE-Origin (Standard: `http://localhost:5173`) |
| `INVITE_CODE` | Pflichtcode für Registrierung (min. 4 Zeichen) |
| `SENTRY_DSN` | Sentry DSN (optional, leer lassen um zu deaktivieren) |

### API Endpoints

#### Auth

| Methode | Pfad | Beschreibung | Auth |
|---|---|---|---|
| `POST` | `/auth/register` | Account erstellen (benötigt `inviteCode`) | – |
| `POST` | `/auth/login` | Einloggen | – |
| `GET` | `/auth/me` | Aktueller User | JWT |

**Register Body:**
```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "password123",
  "avatarId": 3,
  "inviteCode": "quiz2024"
}
```

#### Kartenlisten

| Methode | Pfad | Beschreibung | Auth |
|---|---|---|---|
| `GET` | `/card-lists` | Alle Listen | – |
| `GET` | `/card-lists/:id` | Liste mit Karten | – |
| `POST` | `/card-lists/import` | JSON importieren | JWT |
| `DELETE` | `/card-lists/:id` | Liste löschen | JWT |

#### Spiele

| Methode | Pfad | Beschreibung |
|---|---|---|
| `POST` | `/games` | Neues Spiel erstellen |
| `GET` | `/games/:id` | Spielstatus |
| `POST` | `/games/:id/players` | Spieler hinzufügen |
| `POST` | `/games/:id/start` | Spiel starten |
| `GET` | `/games/:id/current-card` | Aktuelle Karte |
| `POST` | `/games/:id/answer` | Antwort einreichen |
| `GET` | `/games/:id/results` | Ergebnisse |

### Datenbankstruktur

```
users           id, name, email, password_hash, avatar_id, created_at
card_lists      id, title, description, bg_color, created_at
cards           id, card_list_id, type, front, back, options, correct_index, position, bg_color
games           id, card_list_id, status, current_card_index, card_order, created_at, finished_at
game_players    id, game_id, user_id (nullable), name, avatar_id, score, turn_order
game_turns      id, game_id, game_player_id, card_id, result, played_at
```

### Modulstruktur

```
src/
├── config/
│   ├── configuration.ts    Typisierte Konfig-Factory
│   └── validation.ts       Joi-Schema für .env Validierung
├── common/
│   ├── filters/            AllExceptionsFilter – globaler Fehlerhandler
│   ├── guards/             JwtAuthGuard
│   ├── interceptors/       LoggingInterceptor (Request-Timing)
│   └── decorators/         @CurrentUser() – aktuellen User aus JWT lesen
└── modules/
    ├── auth/               Register, Login, JWT Strategy
    ├── users/              User CRUD
    ├── card-lists/         Listen + JSON Import (DataSource Transaction)
    ├── cards/              Card Entity (kein eigener Controller)
    ├── games/              Kompletter Spielablauf
    └── seeds/              Beispieldaten (npm run seed)
```

### Wichtige Logik (Backend)

**Invite-Code:** Wird bei der Registrierung geprüft. Wert kommt aus `INVITE_CODE` in der `.env`. Ohne korrekten Code → `403 Forbidden`.

**Kartenverteilung:** `Math.floor(karten / spieler) * spieler` Karten werden gespielt, der Rest übersprungen. So bekommt jeder Spieler gleich viele Karten.

**Shuffle:** Seeded Fisher-Yates mit der `gameId` als Entropy → deterministische, reproduzierbare Reihenfolge.

**Skip-Mechanik:** Bei `result = 'skip'` bleibt der `currentCardIndex` unverändert, der nächste Spieler bekommt dieselbe Karte.

**Pessimistisches Locking:** `submitAnswer` nutzt eine TypeORM-Transaction mit `FOR UPDATE` Lock um Race Conditions zu vermeiden.

---

## Frontend

**Tech Stack:** Vite · React 18 · TypeScript · SCSS Modules · Zustand · React Router v6 · Axios

### Starten

```bash
cd quiz-cards-ui
npm install
npm run dev       # http://localhost:5173
npm run build     # Produktions-Build
npm run lint      # ESLint
```

### Verzeichnisstruktur

```
src/
├── api/
│   ├── client.ts           Axios-Instanz mit JWT-Interceptor
│   ├── auth.ts             register, login, me
│   ├── cardLists.ts        getAll, getById, importList, deleteList
│   └── games.ts            create, addPlayer, start, currentCard, answer, results
├── components/
│   └── common/
│       ├── AvatarPicker/   Avatar-Auswahl (10 Optionen)
│       ├── Button/         Button mit loading-State und Varianten
│       ├── Input/          Input mit Label und Error-Anzeige
│       ├── PlayerChip/     Spieler-Badge (Avatar + Name)
│       └── ProgressBar/    Fortschrittsbalken
├── pages/
│   ├── Home/               Startseite – Schnellspieler verwalten
│   ├── Lobby/              Kartenliste wählen + Spiel starten
│   ├── Game/               Spielansicht (Karte, Antwort, Scoring)
│   ├── Results/            Ergebnisse + Rangliste
│   ├── Login/              Einloggen
│   └── Register/           Account erstellen (mit Einladungscode)
├── stores/
│   ├── authStore.ts        Zustand: User, Token, isAuthenticated
│   ├── gameStore.ts        Zustand: Spielablauf (lokal + API-Modus)
│   └── playersStore.ts     Zustand: Schnellspieler (localStorage)
├── types/
│   └── index.ts            Alle TypeScript Interfaces
└── utils/
    ├── localStorage.ts     Typisierte localStorage Helfer
    ├── progress.ts         Spaced-Repetition (Level 1–10 pro Karte)
    ├── color.ts            bgColor Fallback-Logik (Card → Liste → Gradient)
    ├── avatars.ts          Avatar-Emoji Mapping (1–10)
    ├── speech.ts           Text-to-Speech Helfer
    └── uuid.ts             UUID-Generator
```

### Seiten-Übersicht

| Route | Seite | Beschreibung |
|---|---|---|
| `/` | Home | Schnellspieler hinzufügen und auswählen |
| `/lobby` | Lobby | Kartenliste importieren/wählen, Spiel starten |
| `/game/:id` | Game | Karte anzeigen, Antwort geben (richtig/falsch/skip) |
| `/results` | Results | Rangliste nach Spielende |
| `/login` | Login | E-Mail + Passwort |
| `/register` | Register | Account erstellen mit Einladungscode |

### State Management (Zustand Stores)

**`authStore`**
- `user`, `token`, `isAuthenticated`
- `setAuth(user, token)` – nach Login/Register
- `logout()` – löscht localStorage

**`gameStore`**
- Zwei Modi: **Local Mode** (alles im RAM, kein BE nötig) und **API Mode** (BE-Spiel)
- `startLocalGame(list, players)` – startet ein lokales Spiel
- `localAnswer(result)` – wertet Antwort aus, updated Scores
- `localGetCurrentCard()` – gibt aktuelle Karte + Spieler zurück
- `localGetResults()` – gibt sortierte Rangliste zurück
- Spaced-Repetition: Karten mit niedrigem Level erscheinen häufiger

**`playersStore`**
- Schnellspieler (ohne Account)
- Persistiert in `localStorage` unter `quiz_quick_players`
- `addPlayer`, `removePlayer`, `toggleSelectPlayer`

### localStorage Keys

| Key | Inhalt |
|---|---|
| `auth_token` | JWT Token |
| `quiz_quick_players` | Schnellspieler-Liste |
| `quiz_local_lists` | Kartenlisten (Offline-Modus) |
| `quiz_active_game` | Aktive Game-ID |
| `quiz_card_progress` | Lernfortschritt pro Karte (Level 1–10) |

### Axios Interceptors

**Request:** Hängt automatisch `Authorization: Bearer <token>` an falls Token vorhanden.

**Response:** Bei `401` → Token löschen + Redirect zu `/login`.

### Spielmodi

**Schnellspiel (ohne Login):**
- Spieler werden mit Name + Avatar erstellt
- Kartenlisten werden lokal in localStorage gespeichert
- Spiel läuft komplett im Browser (kein BE nötig)

**Mit Account (eingeloggt):**
- Kartenlisten werden in der DB gespeichert (persistent)
- Import via API (`POST /card-lists/import`)
- Listen bleiben nach Browser-Clear erhalten

---

## JSON-Format für Kartenlisten

```json
{
  "title": "Meine Kartenliste",
  "description": "Optional",
  "bgColor": "#6C63FF",
  "cards": [
    {
      "type": "qa",
      "front": "Was ist die Hauptstadt von Frankreich?",
      "back": "Paris",
      "bgColor": "#FF6584"
    },
    {
      "type": "multiple_choice",
      "front": "Welches ist das größte Organ des Menschen?",
      "back": "Die Haut",
      "options": ["Leber", "Lunge", "Haut", "Herz"],
      "correctIndex": 2
    }
  ]
}
```

**Kartentypen:**
- `qa` – Frage/Antwort. `front` = Frage, `back` = Antwort.
- `multiple_choice` – Multiple Choice. Benötigt `options` (Array) und `correctIndex` (0-basiert).

**Farben:** `bgColor` ist optional auf Listen- und Kartenebene. Karten-Farbe überschreibt Listen-Farbe. Ohne Farbe → automatischer Farbverlauf.

---

## Lokales Setup

### Voraussetzungen

- Node.js 18+
- PostgreSQL (z.B. [Postgres.app](https://postgresapp.com) für macOS)

### Schritte

```bash
# 1. PostgreSQL starten und Datenbank anlegen
psql -p5432 postgres -c "CREATE DATABASE quiz_cards;"

# 2. Backend einrichten
cd quiz-cards-api
cp .env.example .env
# .env anpassen: DATABASE_USER, INVITE_CODE setzen
npm install
npm run start:dev

# 3. Optional: Beispieldaten laden
npm run seed

# 4. Frontend einrichten (neues Terminal)
cd quiz-cards-ui
npm install
npm run dev
```

**API:** `http://localhost:3000`
**Swagger:** `http://localhost:3000/api/docs`
**FE:** `http://localhost:5173`
