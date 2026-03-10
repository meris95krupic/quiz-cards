import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { gamesApi } from '../../api/games';
import { AvatarPicker } from '../../components/common/AvatarPicker/AvatarPicker';
import { Button } from '../../components/common/Button/Button';
import { Input } from '../../components/common/Input/Input';
import { PlayerChip } from '../../components/common/PlayerChip/PlayerChip';
import type { GamePlayer, OnlineGameState, TurnResult } from '../../types';
import { getAvatarEmoji } from '../../utils/avatars';
import styles from './Room.module.scss';

const SESSION_KEY_PREFIX = 'room_session_';

interface StoredSession {
  playerId: string;
  sessionToken: string;
}

function getStoredSession(gameId: string): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY_PREFIX + gameId);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function storeSession(gameId: string, playerId: string, sessionToken: string) {
  sessionStorage.setItem(SESSION_KEY_PREFIX + gameId, JSON.stringify({ playerId, sessionToken }));
}

type Phase = 'join' | 'lobby' | 'playing';

export const Room = () => {
  const { id: gameId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [avatarId, setAvatarId] = useState(1);
  const [nameError, setNameError] = useState('');
  const [joining, setJoining] = useState(false);

  const [phase, setPhase] = useState<Phase>('join');
  const [myPlayer, setMyPlayer] = useState<GamePlayer | null>(null);
  const [gameState, setGameState] = useState<OnlineGameState | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [error, setError] = useState('');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const applyState = useCallback(
    (s: OnlineGameState, session?: StoredSession | null) => {
      setGameState(s);

      if (s.status === 'finished') {
        stopPolling();
        navigate(`/game/${gameId}/results`);
        return;
      }
      if (s.status === 'in_progress') {
        setPhase('playing');
      }

      const stored = session ?? getStoredSession(gameId ?? '');
      if (stored) {
        const me = s.players.find((p) => p.sessionToken === stored.sessionToken);
        if (me) setMyPlayer(me);
      }
    },
    [gameId, navigate, stopPolling],
  );

  const fetchState = useCallback(async () => {
    if (!gameId) return;
    try {
      const s = await gamesApi.getState(gameId);
      applyState(s);
    } catch {
      /* ignore transient errors */
    }
  }, [gameId, applyState]);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(fetchState, 2500);
  }, [fetchState]);

  useEffect(() => {
    if (!gameId) return;
    const stored = getStoredSession(gameId);

    gamesApi
      .getState(gameId)
      .then((s) => {
        if (stored) {
          const me = s.players.find((p) => p.sessionToken === stored.sessionToken);
          if (me) {
            setMyPlayer(me);
            setPhase(s.status === 'in_progress' ? 'playing' : 'lobby');
          }
        }
        applyState(s, stored);
        if (stored) startPolling();
      })
      .catch(() => setError('Raum nicht gefunden.'));

    return stopPolling;
  }, [gameId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (myPlayer) {
      startPolling();
    }
  }, [myPlayer]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleJoin = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Bitte gib einen Namen ein.');
      return;
    }
    if (!gameId) return;
    setJoining(true);
    setError('');
    try {
      const player = await gamesApi.addPlayer(gameId, { name: trimmed, avatarId });
      const token = player.sessionToken ?? player.id;
      storeSession(gameId, player.id, token);
      setMyPlayer(player);
      setPhase('lobby');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Beitritt fehlgeschlagen. Spiel bereits gestartet?');
    } finally {
      setJoining(false);
    }
  };

  const handleStart = async () => {
    if (!gameId) return;
    setError('');
    try {
      await gamesApi.start(gameId);
      await fetchState();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Spiel konnte nicht gestartet werden.');
    }
  };

  const handleAnswer = async (result: TurnResult, chosenIndex?: number) => {
    if (!gameId || answering) return;
    setAnswering(true);
    try {
      await gamesApi.answer(gameId, result, chosenIndex);
      setIsFlipped(false);
      await fetchState();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'Antwort konnte nicht gesendet werden.');
    } finally {
      setAnswering(false);
    }
  };

  const players = gameState?.players ?? [];
  const isHost = players[0]?.id === myPlayer?.id;
  const isMyTurn = gameState?.currentPlayer?.id === myPlayer?.id;
  const card = gameState?.card ?? null;

  // ─── Join form ─────────────────────────────────────────────────────────────

  if (phase === 'join') {
    return (
      <div className={styles.page}>
        <div className={styles.joinCard}>
          <h1 className={styles.joinTitle}>🎮 Raum beitreten</h1>
          {gameState && (
            <p className={styles.joinInfo}>{players.length} Spieler bisher</p>
          )}
          <Input
            id="room-name"
            placeholder="Dein Name…"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError('');
            }}
            error={nameError}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            autoFocus
            maxLength={30}
          />
          <div className={styles.avatarSection}>
            <p className={styles.avatarLabel}>Avatar wählen</p>
            <AvatarPicker selected={avatarId} onChange={setAvatarId} />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <Button variant="primary" fullWidth disabled={joining} onClick={handleJoin}>
            {joining ? 'Trete bei…' : 'Beitreten'}
          </Button>
        </div>
      </div>
    );
  }

  // ─── Lobby ─────────────────────────────────────────────────────────────────

  if (phase === 'lobby') {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>🎮 Warte-Raum</h1>
          {myPlayer && (
            <span className={styles.badge}>
              {getAvatarEmoji(myPlayer.avatarId)} {myPlayer.name}
            </span>
          )}
        </header>
        <div className={styles.content}>
          <div className={styles.linkBox}>
            <p className={styles.linkLabel}>Link teilen:</p>
            <code className={styles.linkText}>{window.location.href}</code>
            <Button variant="ghost" onClick={() => navigator.clipboard.writeText(window.location.href)}>
              Kopieren
            </Button>
          </div>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Spieler ({players.length})</h2>
            <div className={styles.playerList}>
              {players.map((p, i) => (
                <div
                  key={p.id}
                  className={`${styles.playerRow} ${p.id === myPlayer?.id ? styles.playerRowMe : ''}`}
                >
                  <PlayerChip name={p.name} avatarId={p.avatarId} />
                  {i === 0 && <span className={styles.hostBadge}>Host</span>}
                </div>
              ))}
            </div>
          </section>
          {error && <p className={styles.error}>{error}</p>}
          {isHost ? (
            <Button variant="primary" size="xl" fullWidth disabled={players.length < 1} onClick={handleStart}>
              Spiel starten ({players.length} Spieler)
            </Button>
          ) : (
            <div className={styles.waitMsg}>
              <div className={styles.spinner} />
              <p>Warte auf den Host…</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Playing ───────────────────────────────────────────────────────────────

  const progressPct = gameState
    ? Math.round((gameState.currentCardIndex / Math.max(gameState.totalCards, 1)) * 100)
    : 0;

  return (
    <div className={styles.page}>
      <header className={styles.gameHeader}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
        </div>
        <div className={styles.gameHeaderRow}>
          <span className={styles.cardCounter}>
            {gameState ? gameState.currentCardIndex + 1 : '–'} / {gameState?.totalCards ?? '–'}
          </span>
          <div className={styles.scores}>
            {players.map((p) => (
              <span key={p.id} className={`${styles.score} ${p.id === myPlayer?.id ? styles.scoreMe : ''}`}>
                {getAvatarEmoji(p.avatarId)} {p.score}
              </span>
            ))}
          </div>
        </div>
      </header>

      <div className={styles.gameContent}>
        {isMyTurn && card ? (
          <>
            <p className={styles.turnBanner}>Dein Zug!</p>
            <div
              className={`${styles.cardWrapper} ${isFlipped ? styles.cardFlipped : ''}`}
              onClick={() => !isFlipped && card.type === 'qa' && setIsFlipped(true)}
            >
              <div className={styles.cardInner}>
                <div className={styles.cardFront}>
                  <p className={styles.cardText}>{card.front}</p>
                  {!isFlipped && card.type === 'qa' && (
                    <p className={styles.tapHint}>Tippen zum Aufdecken</p>
                  )}
                </div>
                <div className={styles.cardBack}>
                  <p className={styles.cardText}>{card.back}</p>
                </div>
              </div>
            </div>

            {card.type === 'multiple_choice' && card.options ? (
              <div className={styles.options}>
                {card.options.map((opt, i) => (
                  <button
                    key={i}
                    className={styles.optionBtn}
                    onClick={() => handleAnswer('correct', i)}
                    disabled={answering}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : isFlipped ? (
              <div className={styles.answerBtns}>
                <Button variant="wrong" disabled={answering} onClick={() => handleAnswer('wrong')}>
                  ✗ Falsch
                </Button>
                <Button variant="skip" disabled={answering} onClick={() => handleAnswer('skip')}>
                  — Skip
                </Button>
                <Button variant="correct" disabled={answering} onClick={() => handleAnswer('correct')}>
                  ✓ Richtig
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <div className={styles.waitingScreen}>
            {gameState?.currentPlayer && (
              <>
                <div className={styles.waitAvatar}>
                  {getAvatarEmoji(gameState.currentPlayer.avatarId)}
                </div>
                <p className={styles.waitName}>{gameState.currentPlayer.name}</p>
                <p className={styles.waitSub}>ist dran…</p>
              </>
            )}
            <div className={styles.spinner} />
          </div>
        )}
      </div>
    </div>
  );
};
