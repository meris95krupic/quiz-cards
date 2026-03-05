import { getAvatarEmoji } from '../../../utils/avatars';
import styles from './PlayerChip.module.scss';

interface PlayerChipProps {
  name: string;
  avatarId: number;
  score?: number;
  isActive?: boolean;
  onRemove?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export const PlayerChip = ({
  name,
  avatarId,
  score,
  isActive,
  onRemove,
  size = 'md',
}: PlayerChipProps) => {
  return (
    <div className={`${styles.chip} ${styles[size]} ${isActive ? styles.active : ''}`}>
      <span className={styles.avatar}>{getAvatarEmoji(avatarId)}</span>
      <span className={styles.name}>{name}</span>
      {score !== undefined && (
        <span className={styles.score}>{score > 0 ? `+${score}` : score}</span>
      )}
      {onRemove && (
        <button
          type="button"
          className={styles.remove}
          onClick={onRemove}
          aria-label={`${name} entfernen`}
        >
          ×
        </button>
      )}
    </div>
  );
};
