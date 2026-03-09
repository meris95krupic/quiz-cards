import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AvatarPicker } from '../../components/common/AvatarPicker/AvatarPicker';
import { Button } from '../../components/common/Button/Button';
import { Input } from '../../components/common/Input/Input';
import { PlayerChip } from '../../components/common/PlayerChip/PlayerChip';
import { useAuthStore } from '../../stores/authStore';
import { usePlayersStore } from '../../stores/playersStore';
import styles from './Home.module.scss';

export const Home = () => {
  const navigate = useNavigate();
  const { players, selectedPlayerIds, addPlayer, removePlayer, toggleSelectPlayer, loadFromStorage } =
    usePlayersStore();
  const { user, isAuthenticated, logout } = useAuthStore();

  const [name, setName] = useState('');
  const [avatarId, setAvatarId] = useState(1);
  const [nameError, setNameError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [authIncluded, setAuthIncluded] = useState(true);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const handleAddPlayer = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Bitte gib einen Namen ein.');
      return;
    }
    if (trimmed.length > 30) {
      setNameError('Name darf max. 30 Zeichen lang sein.');
      return;
    }
    addPlayer(trimmed, avatarId);
    setName('');
    setAvatarId(1);
    setNameError('');
    setShowForm(false);
  };

  const authCount = isAuthenticated && authIncluded ? 1 : 0;
  const totalPlayerCount = selectedPlayerIds.length + authCount;
  const canStartGame = totalPlayerCount >= 1;

  const handleStartGame = () => {
    navigate('/lobby', { state: { authIncluded } });
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.logo}>
          <span className={styles.logoIcon}>🃏</span>
          <span className={styles.logoText}>QuizCards</span>
        </h1>
        <div className={styles.headerRight}>
          <button className={styles.shopLink} onClick={() => navigate('/shop')}>🛒</button>
          {isAuthenticated ? (
            <button className={styles.loginLink} onClick={logout}>Ausloggen</button>
          ) : (
            <button className={styles.loginLink} onClick={() => navigate('/login')}>Einloggen</button>
          )}
        </div>
      </header>

      <main className={styles.main}>
        {/* Hero */}
        <div className={styles.hero}>
          <h2 className={styles.heroTitle}>Schnell&shy;spiel</h2>
          <p className={styles.heroSub}>Spieler hinzufügen, Karten wählen, los geht's!</p>
        </div>

        {/* Players section */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Spieler</h3>
            <button className={styles.addBtn} onClick={() => setShowForm((v) => !v)}>
              {showForm ? '✕' : '+ Hinzufügen'}
            </button>
          </div>

          {/* Add player form */}
          {showForm && (
            <div className={styles.addForm}>
              <Input
                id="player-name"
                placeholder="Name eingeben…"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError('');
                }}
                error={nameError}
                onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
                autoFocus
                maxLength={30}
              />
              <div className={styles.avatarSection}>
                <p className={styles.avatarLabel}>Avatar wählen</p>
                <AvatarPicker selected={avatarId} onChange={setAvatarId} />
              </div>
              <Button variant="primary" fullWidth onClick={handleAddPlayer}>
                Spieler hinzufügen
              </Button>
            </div>
          )}

          {/* Quick player list */}
          {players.length > 0 && (
            <ul className={styles.playerList}>
              {players.map((player) => (
                <li key={player.id} className={styles.playerItem}>
                  <button
                    className={`${styles.playerSelect} ${
                      selectedPlayerIds.includes(player.id) ? styles.selected : ''
                    }`}
                    onClick={() => toggleSelectPlayer(player.id)}
                    type="button"
                  >
                    <PlayerChip name={player.name} avatarId={player.avatarId} />
                    {selectedPlayerIds.includes(player.id) && (
                      <span className={styles.checkmark}>✓</span>
                    )}
                  </button>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => removePlayer(player.id)}
                    aria-label={`${player.name} löschen`}
                    type="button"
                  >
                    🗑
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Auth user chip */}
          {isAuthenticated && user && (
            <div className={styles.authPlayerRow}>
              <button
                className={`${styles.playerSelect} ${authIncluded ? styles.selected : ''}`}
                onClick={() => setAuthIncluded((v) => !v)}
                type="button"
              >
                <PlayerChip name={user.name} avatarId={user.avatarId} />
                <span className={styles.youBadge}>Du</span>
                {authIncluded && <span className={styles.checkmark}>✓</span>}
              </button>
            </div>
          )}

          {/* Empty state */}
          {players.length === 0 && !showForm && !isAuthenticated && (
            <div className={styles.empty}>
              <span>👥</span>
              <p>Noch keine Spieler. Füge mindestens einen hinzu!</p>
            </div>
          )}
        </section>

        {/* Start button */}
        <div className={styles.startArea}>
          {!canStartGame && (
            <p className={styles.hint}>Wähle mindestens einen Spieler aus</p>
          )}
          <Button
            variant="primary"
            size="xl"
            fullWidth
            disabled={!canStartGame}
            onClick={handleStartGame}
          >
            Spiel starten{canStartGame && ` (${totalPlayerCount})`}
          </Button>
        </div>
      </main>
    </div>
  );
};
