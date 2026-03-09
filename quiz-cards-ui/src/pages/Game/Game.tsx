import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/common/Button/Button';
import { PlayerChip } from '../../components/common/PlayerChip/PlayerChip';
import { ProgressBar } from '../../components/common/ProgressBar/ProgressBar';
import { useGameStore } from '../../stores/gameStore';
import type { CurrentCardResponse, TurnResult } from '../../types';
import { getCardBackground } from '../../utils/color';
import { speakText, stopSpeech } from '../../utils/speech';
import styles from './Game.module.scss';

export const Game = () => {
  const { id: gameId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { isLocalMode, isFlipped, setFlipped, localGetCurrentCard, localAnswer } = useGameStore();

  const [cardData, setCardData] = useState<CurrentCardResponse | null>(() => {
    if (!isLocalMode) return null;
    return localGetCurrentCard();
  });
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [speakingText, setSpeakingText] = useState<string | null>(null);

  useEffect(() => {
    if (!isLocalMode) { navigate('/'); return; }
    if (!cardData) { navigate(`/game/${gameId}/results`); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopAllSpeech = () => {
    stopSpeech();
    setSpeakingText(null);
  };

  const handleSpeak = (text: string) => {
    if (speakingText === text) {
      stopAllSpeech();
    } else {
      speakText(text, () => setSpeakingText(null));
      setSpeakingText(text);
    }
  };

  const handleAnswer = (result: TurnResult) => {
    stopAllSpeech();
    const answerResult = localAnswer(result);

    if (answerResult.finished) {
      navigate(`/game/${gameId}/results`);
      return;
    }

    const next = localGetCurrentCard();
    if (!next) { navigate(`/game/${gameId}/results`); return; }
    setCardData(next);
    setSelectedOption(null);
  };

  const handleMultipleChoiceSelect = (optionIndex: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(optionIndex);
    const card = cardData?.card;
    if (!card) return;
    const isCorrect = optionIndex === card.correctIndex;
    setTimeout(() => handleAnswer(isCorrect ? 'correct' : 'wrong'), 700);
  };

  const handleFlip = () => {
    stopAllSpeech();
    setFlipped(true);
  };

  if (!cardData) {
    return <div className={styles.loadingPage}><span className={styles.loadingSpinner} /></div>;
  }

  const { card, currentPlayer, cardIndex, totalCards, cardLevel } = cardData;
  const bgColor = getCardBackground(card.bgColor, undefined, cardIndex);

  const SpeakBtn = ({ text }: { text: string }) => (
    <button
      type="button"
      className={`${styles.speakBtn} ${speakingText === text ? styles.speakBtnActive : ''}`}
      onClick={() => handleSpeak(text)}
      aria-label={speakingText === text ? 'Stoppen' : 'Abspielen'}
    >
      {speakingText === text ? '⏸' : '🔊'}
    </button>
  );

  const optionButtons = card.options?.map((opt, i) => {
    let state: 'default' | 'correct' | 'wrong' = 'default';
    if (selectedOption !== null) {
      if (i === card.correctIndex) state = 'correct';
      else if (i === selectedOption) state = 'wrong';
    }
    return (
      <button
        key={i}
        className={`${styles.option} ${styles[state]}`}
        onClick={() => handleMultipleChoiceSelect(i)}
        disabled={selectedOption !== null}
        type="button"
      >
        <span className={styles.optionLetter}>{String.fromCharCode(65 + i)}</span>
        <span className={styles.optionText}>{opt}</span>
      </button>
    );
  });

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <button
          className={styles.menuBtn}
          onClick={() => {
            if (window.confirm('Spiel beenden? Du siehst danach die aktuelle Rangliste.'))
              navigate(`/game/${gameId}/results`);
          }}
        >✕</button>
        <ProgressBar current={cardIndex + 1} total={totalCards} />
      </div>

      {/* Current player indicator */}
      <div className={styles.currentPlayerBar}>
        <span className={styles.currentPlayerLabel}>Jetzt dran:</span>
        <PlayerChip name={currentPlayer.name} avatarId={currentPlayer.avatarId} score={currentPlayer.score} isActive size="md" />
      </div>

      {/* Card */}
      <div className={styles.cardScene}>
        {card.type === 'multiple_choice' ? (
          <div className={styles.mcCard} style={{ background: bgColor }}>
            <div className={styles.cardTopRow}>
              <div className={styles.cardType}>🎯 Multiple Choice</div>
              <div className={styles.levelBadge} title={cardLevel === 10 ? 'Gemeistert!' : `Lernlevel ${cardLevel}/10`}>
                {cardLevel === 10 ? '⭐' : `Lvl ${cardLevel}`}
              </div>
            </div>
            <div className={styles.questionArea}>
              <p className={styles.mcQuestion}>{card.front}</p>
              <SpeakBtn text={card.front} />
            </div>
            <div className={styles.optionsGrid}>{optionButtons}</div>
          </div>
        ) : (
          <div
            className={`${styles.cardWrapper} ${isFlipped ? styles.flipped : ''}`}
            style={{ background: bgColor }}
          >
            {/* Front */}
            <div className={styles.cardFace}>
              <div className={styles.cardTopRow}>
                <div className={styles.cardType}>❓ Frage / Antwort</div>
                <div className={styles.levelBadge} title={cardLevel === 10 ? 'Gemeistert!' : `Lernlevel ${cardLevel}/10`}>
                  {cardLevel === 10 ? '⭐' : `Lvl ${cardLevel}`}
                </div>
              </div>
              <div className={styles.questionArea}>
                <p className={styles.cardQuestion}>{card.front}</p>
                <SpeakBtn text={card.front} />
              </div>
              {!isFlipped && (
                <div className={styles.flipHint}>
                  <Button variant="ghost" size="lg" onClick={handleFlip}>
                    Antwort aufdecken →
                  </Button>
                </div>
              )}
            </div>

            {/* Back */}
            <div className={`${styles.cardFace} ${styles.cardBack}`}>
              <div className={styles.cardType}>💡 Antwort</div>
              <div className={styles.questionArea}>
                <p className={styles.cardAnswer}>{card.back}</p>
                <SpeakBtn text={card.back} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        {card.type === 'qa' && isFlipped && (
          <div className={styles.qaActions}>
            <Button variant="wrong" size="lg" onClick={() => handleAnswer('wrong')}>✗ Falsch</Button>
            <Button variant="skip" size="md" onClick={() => handleAnswer('skip')}>↷ Weiter</Button>
            <Button variant="correct" size="lg" onClick={() => handleAnswer('correct')}>✓ Richtig</Button>
          </div>
        )}
        {card.type === 'qa' && !isFlipped && (
          <Button variant="skip" size="md" fullWidth onClick={() => handleAnswer('skip')}>
            Weiß nicht → nächste Karte
          </Button>
        )}
        {card.type === 'multiple_choice' && selectedOption === null && (
          <p className={styles.mcHint}>Wähle eine Antwort oben</p>
        )}
      </div>
    </div>
  );
};
