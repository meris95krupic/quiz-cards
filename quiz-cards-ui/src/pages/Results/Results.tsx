import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { gamesApi } from '../../api/games';
import { Button } from '../../components/common/Button/Button';
import { useGameStore } from '../../stores/gameStore';
import type { GamePlayer } from '../../types';
import { getAvatarEmoji } from '../../utils/avatars';
import styles from './Results.module.scss';

const MEDALS = ['🥇', '🥈', '🥉'];

export const Results = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { resetGame, isLocalMode, localGetResults } = useGameStore();

  const [players, setPlayers] = useState<GamePlayer[] | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (isLocalMode) {
      setPlayers(localGetResults().players);
    } else if (id) {
      gamesApi
        .getResults(id)
        .then(({ ranking }) => setPlayers(ranking))
        .catch(() => setLoadError('Ergebnisse konnten nicht geladen werden.'));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocalMode, id]);

  const handlePlayAgain = () => {
    resetGame();
    navigate('/lobby');
  };

  const handleHome = () => {
    resetGame();
    navigate('/');
  };

  if (loadError) {
    return (
      <div className={styles.loadingPage}>
        <p style={{ color: 'var(--color-error, #ff4d4f)', padding: '1rem' }}>{loadError}</p>
        <Button variant="ghost" onClick={handleHome}>Zur Startseite</Button>
      </div>
    );
  }

  if (!players) {
    return (
      <div className={styles.loadingPage}>
        <span className={styles.loadingSpinner} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Confetti-like background particles */}
      <div className={styles.particles} aria-hidden="true">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className={styles.particle} style={{ '--i': i } as React.CSSProperties} />
        ))}
      </div>

      <div className={styles.content}>
        {/* Winner banner */}
        {players[0] && (
          <div className={styles.winnerBanner}>
            <div className={styles.winnerEmoji}>
              {getAvatarEmoji(players[0].avatarId)}
            </div>
            <div className={styles.crownEmoji}>👑</div>
            <h1 className={styles.winnerName}>{players[0].name}</h1>
            <p className={styles.winnerScore}>
              {players[0].score} {players[0].score === 1 ? 'Punkt' : 'Punkte'}
            </p>
          </div>
        )}

        {/* Ranking */}
        <div className={styles.rankingCard}>
          <h2 className={styles.rankingTitle}>Rangliste</h2>
          <ol className={styles.rankingList}>
            {players.map((player, i) => (
              <li
                key={player.id}
                className={`${styles.rankingItem} ${i === 0 ? styles.rankingFirst : ''}`}
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <span className={styles.rankPos}>
                  {i < 3 ? MEDALS[i] : `${i + 1}.`}
                </span>
                <span className={styles.rankAvatar}>
                  {getAvatarEmoji(player.avatarId)}
                </span>
                <span className={styles.rankName}>{player.name}</span>
                <span className={styles.rankScore}>
                  <span className={player.score >= 0 ? styles.positive : styles.negative}>
                    {player.score >= 0 ? '+' : ''}{player.score}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* CTA buttons */}
        <div className={styles.ctaGroup}>
          <Button variant="primary" size="lg" fullWidth onClick={handlePlayAgain}>
            🔄 Nochmal spielen
          </Button>
          <Button variant="ghost" size="md" fullWidth onClick={handleHome}>
            Zur Startseite
          </Button>
        </div>
      </div>
    </div>
  );
};
