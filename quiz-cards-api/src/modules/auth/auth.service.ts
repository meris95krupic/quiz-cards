/**
 * AUTH SERVICE — Die Geschaeftslogik fuer Registrierung und Login.
 *
 * === Was ist ein Service in NestJS? ===
 * Ein Service (@Injectable) enthaelt die eigentliche Geschaeftslogik.
 * Der Controller nimmt die Anfrage entgegen und delegiert an den Service.
 * Der Service arbeitet mit der Datenbank, erstellt Tokens, hasht Passwoerter, etc.
 *
 * === Warum trennen wir Controller und Service? ===
 * 1. Wiederverwendbarkeit: Der gleiche Service kann von mehreren Controllern genutzt werden
 * 2. Testbarkeit: Services lassen sich einfacher unit-testen als Controller
 * 3. Saubere Architektur: Jede Klasse hat genau eine Aufgabe
 *
 * === Ablauf der Authentifizierung ===
 * REGISTRIERUNG:
 *   1. Client schickt name, email, password, avatarId, inviteCode
 *   2. Service prueft den Einladungscode
 *   3. Service prueft, ob die Email schon existiert
 *   4. Passwort wird mit bcrypt gehasht (Einweg-Verschluesselung)
 *   5. User wird in der DB gespeichert
 *   6. JWT-Token wird erstellt und zurueckgegeben
 *
 * LOGIN:
 *   1. Client schickt email + password
 *   2. Service sucht den User in der DB
 *   3. Passwort wird mit bcrypt.compare() gegen den Hash geprueft
 *   4. Bei Erfolg: JWT-Token wird erstellt und zurueckgegeben
 */

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

/**
 * TypeScript Utility Type: Omit<User, 'passwordHash'>
 * Erstellt einen neuen Typ, der alle Felder von User enthaelt AUSSER passwordHash.
 * Das nutzen wir, um sicherzustellen, dass wir niemals das Passwort zurueckgeben.
 */
type SafeUser = Omit<User, 'passwordHash'>;

/**
 * Hilfsfunktion: Entfernt den passwordHash aus einem User-Objekt.
 * Wird bei register() und login() verwendet, um den User sicher zurueckzugeben.
 */
function stripPassword(user: User): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _pw, ...safe } = user;
  return safe;
}

/**
 * @Injectable() — Markiert diese Klasse als "injectable", d.h. NestJS kann sie
 * per Dependency Injection ueberall dort bereitstellen, wo sie benoetigt wird.
 * Ohne diesen Decorator wuerde NestJS die Klasse nicht verwalten koennen.
 */
@Injectable()
export class AuthService {
  /**
   * Constructor Injection — NestJS injiziert automatisch drei Abhaengigkeiten:
   *
   * @InjectRepository(User) userRepo: Repository<User>
   * ---------------------------------------------------
   * Ein TypeORM-Repository ist wie ein "Datenbankzugangs-Objekt" fuer eine bestimmte
   * Tabelle. Repository<User> bietet Methoden wie:
   *   - findOne()  — einen User suchen
   *   - create()   — ein User-Objekt im Speicher erstellen (noch NICHT in der DB!)
   *   - save()     — ein User-Objekt in die DB speichern (INSERT oder UPDATE)
   *   - find()     — mehrere User suchen
   *   - delete()   — einen User loeschen
   * Der @InjectRepository()-Decorator sagt NestJS, welches Repository gemeint ist.
   *
   * JwtService — Kommt aus @nestjs/jwt (via JwtModule im auth.module.ts).
   * Bietet Methoden zum Erstellen (sign) und Verifizieren (verify) von JWT-Tokens.
   *
   * ConfigService — Zugriff auf Umgebungsvariablen (.env) und Konfigurationswerte.
   * Hier brauchen wir ihn fuer den Einladungscode (INVITE_CODE).
   */
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * REGISTRIERUNG — Neuen Benutzer anlegen
   *
   * @param dto - Die validierten Registrierungsdaten (name, email, password, avatarId, inviteCode)
   * @returns Ein Objekt mit dem JWT-Token und den User-Daten (ohne Passwort)
   *
   * === Fehlerbehandlung mit NestJS-Exceptions ===
   * NestJS hat eingebaute Exception-Klassen, die automatisch den richtigen HTTP-Status setzen:
   *   - ForbiddenException  → 403 (Zugriff verboten)
   *   - ConflictException   → 409 (Konflikt, z.B. Email schon vergeben)
   *   - UnauthorizedException → 401 (Nicht authentifiziert)
   *   - NotFoundException   → 404 (Nicht gefunden)
   *   - BadRequestException → 400 (Ungueltige Anfrage)
   */
  async register(
    dto: RegisterDto,
  ): Promise<{ accessToken: string; user: SafeUser }> {
    /**
     * Schritt 1: Einladungscode pruefen
     * Nur wer den richtigen Code kennt, darf sich registrieren.
     * Der erwartete Code kommt aus der .env-Datei (INVITE_CODE).
     */
    const expected = this.configService.get<string>('inviteCode');
    if (!expected || dto.inviteCode !== expected) {
      throw new ForbiddenException('Ungültiger Einladungscode');
    }

    /**
     * Schritt 2: Pruefen, ob die Email schon registriert ist
     * findOne() sucht genau einen Datensatz. Wenn keiner gefunden wird, gibt es null zurueck.
     */
    const existing = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    /**
     * Schritt 3: Passwort hashen mit bcrypt
     *
     * === Was ist Hashing? ===
     * Hashing ist eine Einweg-Verschluesselung: Aus "password123" wird ein langer String
     * wie "$2b$10$X7z...". Man kann den Hash NICHT zurueck in "password123" umwandeln.
     *
     * === Warum bcrypt? ===
     * bcrypt ist speziell fuer Passwoerter entwickelt:
     * - Es ist absichtlich langsam (erschwert Brute-Force-Angriffe)
     * - Es erzeugt bei jedem Aufruf einen anderen Hash (dank "Salt")
     * - Der Salt-Wert wird im Hash selbst gespeichert
     *
     * Der zweite Parameter (10) ist der "Salt Rounds" / "Cost Factor":
     * Hoehere Werte = sicherer, aber langsamer. 10 ist ein guter Standard.
     *
     * Beispiel:
     *   bcrypt.hash("password123", 10)
     *   → "$2b$10$X7zDG3qR1YhKj...." (60 Zeichen, jedes Mal anders)
     */
    const passwordHash = await bcrypt.hash(dto.password, 10);

    /**
     * Schritt 4: User-Objekt erstellen und in der DB speichern
     *
     * create() erstellt nur ein JavaScript-Objekt im Speicher — es schreibt noch
     * NICHTS in die Datenbank! Erst save() fuehrt das tatsaechliche INSERT aus.
     *
     * Warum zwei Schritte?
     * - create() setzt Default-Werte und initialisiert Relationen
     * - Zwischen create() und save() kann man das Objekt noch manipulieren
     * - save() gibt das gespeicherte Objekt MIT der generierten ID zurueck
     */
    const user = this.userRepo.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      avatarId: dto.avatarId,
    });
    await this.userRepo.save(user);

    /**
     * Schritt 5: JWT-Token erstellen und zusammen mit den User-Daten zurueckgeben.
     * stripPassword() entfernt den passwordHash aus der Antwort.
     */
    return { accessToken: this.signToken(user), user: stripPassword(user) };
  }

  /**
   * LOGIN — Benutzer authentifizieren und Token zurueckgeben
   *
   * @param dto - Email und Passwort
   * @returns JWT-Token + User-Daten
   *
   * Wichtig: Die Fehlermeldung ist absichtlich generisch ("Invalid credentials"),
   * damit ein Angreifer nicht erfahren kann, ob die Email existiert oder nur
   * das Passwort falsch ist.
   */
  async login(dto: LoginDto): Promise<{ accessToken: string; user: SafeUser }> {
    /**
     * Schritt 1: User anhand der Email in der DB suchen
     */
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    /**
     * Schritt 2: Passwort pruefen mit bcrypt.compare()
     *
     * bcrypt.compare() nimmt das eingegebene Klartext-Passwort und den gespeicherten
     * Hash und prueft, ob sie zusammenpassen. Es hasht das eingegebene Passwort
     * mit dem gleichen Salt (der im Hash enthalten ist) und vergleicht die Ergebnisse.
     *
     * bcrypt.compare("password123", "$2b$10$X7z...") → true oder false
     */
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    /**
     * Schritt 3: Token erstellen und zurueckgeben
     */
    return { accessToken: this.signToken(user), user: stripPassword(user) };
  }

  /**
   * JWT-Token erstellen (signieren)
   *
   * jwtService.sign() erstellt einen signierten JWT-Token mit den angegebenen Daten.
   *
   * === Was steht im Token-Payload? ===
   * - sub: Die User-ID (Standard-Claim "subject" gemaess JWT-Spezifikation)
   * - email: Die Email-Adresse des Users
   *
   * Der JwtService verwendet automatisch das Secret und die expiresIn-Einstellung
   * aus der Modul-Konfiguration (auth.module.ts).
   *
   * Das Ergebnis ist ein String wie:
   *   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0..."
   *
   * Dieser Token wird vom Client gespeichert und bei jeder geschuetzten Anfrage
   * im Authorization-Header mitgeschickt.
   */
  private signToken(user: User): string {
    return this.jwtService.sign({ sub: user.id, email: user.email });
  }
}
