/**
 * Detects language from text heuristics.
 * Supported: Arabic, German, Bosnian (→ Croatian voice), English (default).
 */

// Common German words (no umlauts needed) to catch plain German text
const DE_WORDS = new Set([
  'der', 'die', 'das', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines',
  'und', 'oder', 'aber', 'nicht', 'ist', 'sind', 'war', 'waren', 'hat', 'haben',
  'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr',
  'mit', 'von', 'für', 'auf', 'aus', 'an', 'in', 'zu', 'bei', 'nach',
  'als', 'wie', 'so', 'dann', 'wenn', 'auch', 'noch', 'schon', 'nur',
  'ja', 'nein', 'bitte', 'danke', 'hallo', 'gut', 'sehr', 'viel',
  'heute', 'morgen', 'gestern', 'jetzt', 'hier', 'dort', 'immer', 'nie',
  'dem', 'den', 'des', 'am', 'im', 'zum', 'zur', 'vom',
  'wird', 'kann', 'muss', 'soll', 'will', 'darf', 'mag',
]);

function looksGerman(text: string): boolean {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);
  if (words.some((w) => DE_WORDS.has(w.replace(/[.,!?;:]$/, '')))) return true;
  // German-specific letter combos & suffixes
  if (/\b\w*(ung|heit|keit|schaft|lich|isch|ig)\b/.test(lower)) return true;
  if (/(?:sch|[ck]{2}|tz)\w/.test(lower)) return true;
  return false;
}

export function detectLang(text: string): string {
  if (/[\u0600-\u06FF]/.test(text)) return 'ar';
  if (/[äöüÄÖÜß]/.test(text)) return 'de';
  if (/[čćšđžČĆŠĐŽ]/.test(text)) return 'hr'; // Bosnian → Croatian (same voice)
  if (looksGerman(text)) return 'de';
  return 'en';
}

function findVoice(langPrefix: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix)) ?? null
  );
}

function doSpeak(text: string, onEnd: () => void): void {
  const lang = detectLang(text);
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.9;
  utterance.onend = onEnd;
  utterance.onerror = onEnd;

  const voice = findVoice(lang);
  if (voice) utterance.voice = voice;

  window.speechSynthesis.speak(utterance);
}

export function speakText(text: string, onEnd: () => void): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();

  // Chrome loads voices asynchronously — wait if not ready yet
  if (window.speechSynthesis.getVoices().length > 0) {
    doSpeak(text, onEnd);
  } else {
    window.speechSynthesis.addEventListener('voiceschanged', () => doSpeak(text, onEnd), { once: true });
  }
}

export function stopSpeech(): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
}
