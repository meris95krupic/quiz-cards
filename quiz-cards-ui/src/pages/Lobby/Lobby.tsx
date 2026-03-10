import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cardListsApi } from '../../api/cardLists';
import { gamesApi } from '../../api/games';
import { shopApi } from '../../api/shop';
import { Button } from '../../components/common/Button/Button';
import { PlayerChip } from '../../components/common/PlayerChip/PlayerChip';
import { useAuthStore } from '../../stores/authStore';
import { useGameStore } from '../../stores/gameStore';
import { usePlayersStore } from '../../stores/playersStore';
import type { CardList, ImportCardList } from '../../types';
import { getCardBackground } from '../../utils/color';
import { getLocalLists, saveLocalLists } from '../../utils/localStorage';
import { generateId } from '../../utils/uuid';
import styles from './Lobby.module.scss';

function parseAndValidate(json: unknown): CardList {
  const raw = json as ImportCardList;
  if (!raw.title || typeof raw.title !== 'string') throw new Error('Kein "title" gefunden.');
  if (!Array.isArray(raw.cards) || raw.cards.length === 0) throw new Error('Keine Karten gefunden.');

  return {
    id: generateId(),
    title: raw.title,
    description: raw.description,
    bgColor: raw.bgColor,
    cards: raw.cards.map((c, i) => {
      if (c.type !== 'qa' && c.type !== 'multiple_choice') {
        throw new Error(`Karte ${i + 1}: Ungültiger Typ "${String(c.type)}". Erlaubt: qa, multiple_choice`);
      }
      if (!c.front || !c.back) throw new Error(`Karte ${i + 1}: "front" und "back" sind Pflichtfelder.`);
      return {
        id: generateId(),
        cardListId: '',
        type: c.type,
        front: c.front,
        back: c.back,
        options: c.options,
        correctIndex: c.correctIndex,
        position: i,
        bgColor: c.bgColor,
      };
    }),
  };
}

export const Lobby = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const authIncluded = (location.state as { authIncluded?: boolean })?.authIncluded ?? true;

  const { selectedPlayerIds, players, loadFromStorage } = usePlayersStore();
  const { startLocalGame } = useGameStore();
  const { isAuthenticated, user } = useAuthStore();

  const [lists, setLists] = useState<CardList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [importError, setImportError] = useState('');
  const [maxCards, setMaxCards] = useState<number | null>(null);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const quickPlayers = players.filter((p) => selectedPlayerIds.includes(p.id));
  const authPlayer = isAuthenticated && user && authIncluded
    ? [{ name: user.name, avatarId: user.avatarId }]
    : [];
  const selectedPlayers = [
    ...authPlayer,
    ...quickPlayers.map((p) => ({ name: p.name, avatarId: p.avatarId })),
  ];

  useEffect(() => {
    loadFromStorage();
    if (isAuthenticated) {
      cardListsApi.getAll().then(setLists).catch(() => setLists(getLocalLists()));
    } else {
      setLists(getLocalLists());
    }
  }, [loadFromStorage, isAuthenticated]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');

    try {
      const text = await file.text();
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error('Datei ist kein gültiges JSON.');
      }

      if (isAuthenticated) {
        const saved = await cardListsApi.importList(json as ImportCardList);
        setLists((prev) => [...prev, saved]);
        setSelectedListId(saved.id);
      } else {
        const list = parseAndValidate(json);
        const updated = [...getLocalLists(), list];
        saveLocalLists(updated);
        setLists(updated);
        setSelectedListId(list.id);
      }
    } catch (err: unknown) {
      setImportError((err as Error).message ?? 'Ungültige Datei.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDeleteList = async (id: string) => {
    if (isAuthenticated) {
      await cardListsApi.deleteList(id).catch(() => {});
      setLists((prev) => prev.filter((l) => l.id !== id));
    } else {
      const updated = lists.filter((l) => l.id !== id);
      saveLocalLists(updated);
      setLists(updated);
    }
    if (selectedListId === id) setSelectedListId(null);
  };

  const handleStartGame = () => {
    const list = lists.find((l) => l.id === selectedListId);
    if (!list || selectedPlayers.length === 0) return;

    const gameId = startLocalGame(list, selectedPlayers, maxCards ?? undefined);
    navigate(`/game/${gameId}`);
  };

  const handleSubmitToShop = async (listId: string) => {
    setSubmittingId(listId);
    try {
      await shopApi.submit(listId);
      setSubmittedIds((prev) => new Set(prev).add(listId));
    } catch {
      // Already submitted or error – mark as submitted to avoid repeated clicks
      setSubmittedIds((prev) => new Set(prev).add(listId));
    } finally {
      setSubmittingId(null);
    }
  };

  const handleStartOnlineGame = async () => {
    if (!selectedListId) return;
    try {
      const game = await gamesApi.create(selectedListId);

      // Pre-add all selected players and store their session tokens
      const sessions: { playerId: string; sessionToken: string }[] = [];

      // Authenticated user first (with userId for progress tracking)
      if (isAuthenticated && user && authIncluded) {
        const player = await gamesApi.addPlayer(game.id, {
          name: user.name,
          avatarId: user.avatarId,
          userId: user.id,
        });
        const token = player.sessionToken ?? player.id;
        sessions.push({ playerId: player.id, sessionToken: token });
      }

      // Quick players (no userId)
      for (const p of quickPlayers) {
        const player = await gamesApi.addPlayer(game.id, { name: p.name, avatarId: p.avatarId });
        const token = player.sessionToken ?? player.id;
        sessions.push({ playerId: player.id, sessionToken: token });
      }

      sessionStorage.setItem(`room_sessions_${game.id}`, JSON.stringify(sessions));
      navigate(`/room/${game.id}`);
    } catch {
      setImportError('Online-Spiel konnte nicht erstellt werden.');
    }
  };

  const selectedList = lists.find((l) => l.id === selectedListId);
  const canStart = selectedListId !== null && selectedPlayers.length >= 1;
  const canStartOnline = selectedListId !== null && isAuthenticated;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>←</button>
        <h1 className={styles.title}>Lobby</h1>
        <div />
      </header>

      <div className={styles.content}>
        {/* Players */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Spieler ({selectedPlayers.length})</h2>
          {selectedPlayers.length === 0 ? (
            <p className={styles.hint}>
              Keine Spieler ausgewählt.{' '}
              <button className={styles.textLink} onClick={() => navigate('/')}>
                Zurück zur Startseite
              </button>
            </p>
          ) : (
            <div className={styles.playerChips}>
              {selectedPlayers.map((p, i) => (
                <PlayerChip key={`${p.name}-${i}`} name={p.name} avatarId={p.avatarId} size="sm" />
              ))}
            </div>
          )}
        </section>

        {/* Card lists */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Kartenlisten</h2>
            <label className={styles.importBtn}>
              + Importieren
              <input
                ref={fileRef}
                type="file"
                accept=".json"
                className={styles.fileInput}
                onChange={handleFileUpload}
              />
            </label>
          </div>

          {importError && <p className={styles.importError}>⚠️ {importError}</p>}

          {lists.length === 0 ? (
            <div className={styles.emptyLists}>
              <span>📂</span>
              <p>Noch keine Listen. Importiere eine JSON-Datei!</p>
            </div>
          ) : (
            <ul className={styles.listGrid}>
              {lists.map((list, i) => {
                const bg = getCardBackground(undefined, list.bgColor, i);
                return (
                  <li key={list.id}>
                    <button
                      className={`${styles.listCard} ${selectedListId === list.id ? styles.listCardActive : ''}`}
                      style={{ background: bg }}
                      onClick={() => setSelectedListId(list.id)}
                      type="button"
                    >
                      <span className={styles.listTitle}>{list.title}</span>
                      {list.description && (
                        <span className={styles.listDesc}>{list.description}</span>
                      )}
                      <span className={styles.listMeta}>
                        {list.cards?.length ?? 0} Karten
                      </span>
                      {selectedListId === list.id && (
                        <span className={styles.listCheck}>✓</span>
                      )}
                    </button>
                    {isAuthenticated && (
                      <button
                        className={styles.shopBtn}
                        onClick={() => handleSubmitToShop(list.id)}
                        type="button"
                        disabled={submittingId === list.id || submittedIds.has(list.id)}
                        title="In den Shop hochladen"
                        aria-label={`${list.title} in den Shop hochladen`}
                      >
                        {submittedIds.has(list.id) ? '✓' : submittingId === list.id ? '…' : '🛒'}
                      </button>
                    )}
                    <button
                      className={styles.deleteListBtn}
                      onClick={() => handleDeleteList(list.id)}
                      type="button"
                      aria-label={`${list.title} löschen`}
                    >
                      🗑
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {selectedList && (
          <div className={styles.selectedInfo}>
            <span>📋</span>
            <span>
              <strong>{selectedList.title}</strong> · {selectedList.cards?.length ?? 0} Karten · {selectedPlayers.length} Spieler
            </span>
          </div>
        )}

        {selectedList && (selectedList.cards?.length ?? 0) > 10 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Wie viele Karten?</h2>
            <div className={styles.cardCountOptions}>
              {([10, 20, 30, 50] as const)
                .filter((n) => n < (selectedList.cards?.length ?? 0))
                .map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`${styles.countBtn} ${maxCards === n ? styles.countBtnActive : ''}`}
                    onClick={() => setMaxCards(maxCards === n ? null : n)}
                  >
                    {n}
                  </button>
                ))}
              <button
                type="button"
                className={`${styles.countBtn} ${maxCards === null ? styles.countBtnActive : ''}`}
                onClick={() => setMaxCards(null)}
              >
                Alle ({selectedList.cards?.length ?? 0})
              </button>
            </div>
          </section>
        )}
      </div>

      <div className={styles.cta}>
        <Button
          variant="primary"
          size="xl"
          fullWidth
          disabled={!canStart}
          onClick={handleStartGame}
        >
          Lokal spielen!
        </Button>
        {isAuthenticated && (
          <Button
            variant="secondary"
            size="xl"
            fullWidth
            disabled={!canStartOnline}
            onClick={handleStartOnlineGame}
          >
            🌐 Online spielen
          </Button>
        )}
      </div>
    </div>
  );
};
