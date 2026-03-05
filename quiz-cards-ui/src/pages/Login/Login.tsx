import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { Button } from '../../components/common/Button/Button';
import { Input } from '../../components/common/Input/Input';
import { useAuthStore } from '../../stores/authStore';
import styles from './Login.module.scss';

export const Login = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError('');

    try {
      const { accessToken, user } = await authApi.login({ email, password });
      setAuth(user, accessToken);
      navigate('/');
    } catch {
      setError('E-Mail oder Passwort falsch.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <button className={styles.backBtn} onClick={() => navigate('/')}>
        ← Zurück
      </button>

      <div className={styles.card}>
        <div className={styles.iconWrap}>🔐</div>
        <h1 className={styles.title}>Einloggen</h1>
        <p className={styles.sub}>Melde dich mit deinem Account an</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <Input
            id="email"
            type="email"
            label="E-Mail"
            placeholder="deine@email.de"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <Input
            id="password"
            type="password"
            label="Passwort"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          {error && <p className={styles.error}>{error}</p>}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            disabled={!email || !password}
          >
            Einloggen
          </Button>
        </form>

        <p className={styles.footer}>
          Noch kein Account?{' '}
          <Link to="/register" className={styles.link}>
            Registrieren
          </Link>
        </p>
      </div>
    </div>
  );
};
