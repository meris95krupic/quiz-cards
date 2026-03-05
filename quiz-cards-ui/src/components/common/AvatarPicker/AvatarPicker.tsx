import { AVATAR_EMOJIS } from '../../../utils/avatars';
import styles from './AvatarPicker.module.scss';

interface AvatarPickerProps {
  selected: number;
  onChange: (id: number) => void;
}

export const AvatarPicker = ({ selected, onChange }: AvatarPickerProps) => {
  return (
    <div className={styles.grid}>
      {AVATAR_EMOJIS.map((emoji, i) => {
        const id = i + 1;
        return (
          <button
            key={id}
            type="button"
            className={`${styles.item} ${selected === id ? styles.active : ''}`}
            onClick={() => onChange(id)}
            aria-label={`Avatar ${id}`}
            aria-pressed={selected === id}
          >
            <span className={styles.emoji}>{emoji}</span>
          </button>
        );
      })}
    </div>
  );
};
