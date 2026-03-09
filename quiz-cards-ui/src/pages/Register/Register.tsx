import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { AvatarPicker } from '../../components/common/AvatarPicker/AvatarPicker';
import { Button } from '../../components/common/Button/Button';
import { Input } from '../../components/common/Input/Input';
import { useAuthStore } from '../../stores/authStore';
import styles from './Register.module.scss';

export const Register = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatarId, setAvatarId] = useState(1);
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !inviteCode) return;
    if (password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen haben.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { accessToken, user } = await authApi.register({ name, email, password, avatarId, inviteCode });
      setAuth(user, accessToken);
      navigate('/');
    } catch (err: unknown) {
      const raw = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
      const msg =
        typeof raw === 'string' ? raw
        : Array.isArray(raw) ? (raw[0] as string)
        : raw && typeof raw === 'object' ? ((raw as { message?: string }).message ?? 'Registrierung fehlgeschlagen.')
        : 'Registrierung fehlgeschlagen.';
      setError(msg);
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
        <div className={styles.iconWrap}>✨</div>
        <h1 className={styles.title}>Account erstellen</h1>

        <form className={styles.form} onSubmit={handleSubmit}>
          <Input
            id="reg-name"
            label="Name"
            placeholder="Dein Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
          />
          <Input
            id="reg-email"
            type="email"
            label="E-Mail"
            placeholder="deine@email.de"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <Input
            id="reg-password"
            type="password"
            label="Passwort"
            placeholder="Min. 8 Zeichen"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />

          <Input
            id="reg-invite"
            label="Einladungscode"
            placeholder="Code eingeben…"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            autoComplete="off"
          />

          <div className={styles.avatarSection}>
            <p className={styles.avatarLabel}>Avatar wählen</p>
            <AvatarPicker selected={avatarId} onChange={setAvatarId} />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            disabled={!name || !email || !password || !inviteCode}
          >
            Account erstellen
          </Button>
        </form>

        <p className={styles.footer}>
          Schon ein Account?{' '}
          <Link to="/login" className={styles.link}>
            Einloggen
          </Link>
        </p>
      </div>
    </div>
  );
};
