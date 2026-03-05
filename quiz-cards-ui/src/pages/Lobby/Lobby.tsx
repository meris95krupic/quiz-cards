import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cardListsApi } from '../../api/cardLists';
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
  const { selectedPlayerIds, players, loadFromStorage } = usePlayersStore();
  const { startLocalGame } = useGameStore();
  const { isAuthenticated, user } = useAuthStore();

  const [lists, setLists] = useState<CardList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [importError, setImportError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const quickPlayers = players.filter((p) => selectedPlayerIds.includes(p.id));
  const authPlayer = isAuthenticated && user
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

    const gameId = startLocalGame(list, selectedPlayers);
    navigate(`/game/${gameId}`);
  };

  const selectedList = lists.find((l) => l.id === selectedListId);
  const canStart = selectedListId !== null && selectedPlayers.length >= 1;

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
      </div>

      <div className={styles.cta}>
        <Button
          variant="primary"
          size="xl"
          fullWidth
          disabled={!canStart}
          onClick={handleStartGame}
        >
          Spiel starten!
        </Button>
      </div>
    </div>
  );
};
