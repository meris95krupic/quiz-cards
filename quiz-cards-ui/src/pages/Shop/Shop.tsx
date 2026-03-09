import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { shopApi } from '../../api/shop';
import { Button } from '../../components/common/Button/Button';
import { useAuthStore } from '../../stores/authStore';
import type { ShopSubmission } from '../../types';
import styles from './Shop.module.scss';

export const Shop = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const isAdmin = isAuthenticated && user?.email === 'meris-k@hotmail.com';

  const [approved, setApproved] = useState<ShopSubmission[]>([]);
  const [pending, setPending] = useState<ShopSubmission[]>([]);
  const [tab, setTab] = useState<'approved' | 'pending'>('approved');
  const [importing, setImporting] = useState<string | null>(null);
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  useEffect(() => {
    shopApi.getApproved().then(setApproved).catch(console.error);
    if (isAdmin) {
      shopApi.getPending().then(setPending).catch(console.error);
    }
  }, [isAdmin]);

  const handleImport = async (submission: ShopSubmission) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setImporting(submission.id);
    setError('');
    try {
      await shopApi.importToMyLists(submission.id);
      setImportedIds((prev) => new Set(prev).add(submission.id));
    } catch {
      setError('Import fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setImporting(null);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await shopApi.approve(id);
      setPending((prev) => prev.filter((s) => s.id !== id));
      const updated = await shopApi.getApproved();
      setApproved(updated);
    } catch {
      setError('Fehler beim Genehmigen.');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await shopApi.reject(id);
      setPending((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setError('Fehler beim Ablehnen.');
    }
  };

  const handleRemove = async (sub: ShopSubmission) => {
    if (!window.confirm(`"${sub.cardList.title}" aus dem Shop entfernen?`)) return;
    try {
      await shopApi.remove(sub.id);
      setApproved((prev) => prev.filter((s) => s.id !== sub.id));
      setPending((prev) => prev.filter((s) => s.id !== sub.id));
    } catch {
      setError('Löschen fehlgeschlagen.');
    }
  };

  const canDelete = (sub: ShopSubmission) =>
    isAdmin || (isAuthenticated && user?.id === sub.submittedBy);

  const list = tab === 'approved' ? approved : pending;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>
          ← Zurück
        </button>
        <h1 className={styles.title}>🛒 Shop</h1>
      </header>

      {isAdmin && (
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'approved' ? styles.tabActive : ''}`}
            onClick={() => setTab('approved')}
          >
            Genehmigt ({approved.length})
          </button>
          <button
            className={`${styles.tab} ${tab === 'pending' ? styles.tabActive : ''}`}
            onClick={() => setTab('pending')}
          >
            Ausstehend ({pending.length})
          </button>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {list.length === 0 ? (
        <div className={styles.empty}>
          <span>📦</span>
          <p>{tab === 'approved' ? 'Noch keine Listen im Shop.' : 'Keine ausstehenden Einreichungen.'}</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {list.map((sub) => (
            <div key={sub.id} className={styles.card}>
              <div
                className={styles.cardHeader}
                style={{ background: sub.cardList.bgColor ?? '#1e1e3a' }}
              >
                <h2 className={styles.cardTitle}>{sub.cardList.title}</h2>
                <div className={styles.cardHeaderRight}>
                  <span className={styles.cardCount}>
                    {sub.cardList.cards?.length ?? '?'} Karten
                  </span>
                  {canDelete(sub) && (
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleRemove(sub)}
                      title="Aus dem Shop entfernen"
                      aria-label="Löschen"
                    >
                      🗑
                    </button>
                  )}
                </div>
              </div>
              <div className={styles.cardBody}>
                {sub.cardList.description && (
                  <p className={styles.cardDesc}>{sub.cardList.description}</p>
                )}
                <p className={styles.cardMeta}>von {sub.submitter.name}</p>

                {tab === 'approved' && (
                  <Button
                    variant="primary"
                    fullWidth
                    disabled={importing === sub.id || importedIds.has(sub.id)}
                    onClick={() => handleImport(sub)}
                  >
                    {importedIds.has(sub.id)
                      ? '✓ Importiert'
                      : importing === sub.id
                      ? 'Importiere…'
                      : 'Importieren'}
                  </Button>
                )}

                {tab === 'pending' && isAdmin && (
                  <div className={styles.adminActions}>
                    <Button variant="primary" onClick={() => handleApprove(sub.id)}>
                      ✓ Genehmigen
                    </Button>
                    <Button variant="danger" onClick={() => handleReject(sub.id)}>
                      ✕ Ablehnen
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
