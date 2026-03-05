import type { InputHTMLAttributes } from 'react';
import styles from './Input.module.scss';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = ({ label, error, id, className, ...rest }: InputProps) => {
  return (
    <div className={`${styles.wrapper} ${className ?? ''}`}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      )}
      <input
        id={id}
        className={`${styles.input} ${error ? styles.hasError : ''}`}
        {...rest}
      />
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
};
