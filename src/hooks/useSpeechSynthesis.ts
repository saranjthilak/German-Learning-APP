// ─────────────────────────────────────────────────────────────────────────────
// useSpeechSynthesis — wraps the Web Speech Synthesis API
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseSpeechSynthesisReturn {
  speak: (text: string, lang?: 'de-DE' | 'en-US', onEnd?: () => void) => void;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
}

const useSpeechSynthesis = (): UseSpeechSynthesisReturn => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices]         = useState<SpeechSynthesisVoice[]>([]);
  const queueRef                    = useRef<SpeechSynthesisUtterance[]>([]);
  const isSupported                 = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Load available voices (async on some browsers)
  useEffect(() => {
    if (!isSupported) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, [isSupported]);

  const getBestVoice = useCallback(
    (lang: 'de-DE' | 'en-US'): SpeechSynthesisVoice | undefined => {
      const langCode = lang.toLowerCase();
      // Prefer "neural" / "natural" voices for quality
      const premium = voices.find(
        (v) => v.lang.toLowerCase().startsWith(langCode.slice(0, 2)) &&
               (v.name.toLowerCase().includes('neural') || v.name.toLowerCase().includes('natural'))
      );
      if (premium) return premium;
      return voices.find((v) => v.lang.toLowerCase().startsWith(langCode.slice(0, 2)));
    },
    [voices]
  );

  const speak = useCallback(
    (text: string, lang: 'de-DE' | 'en-US' = 'de-DE', onEnd?: () => void) => {
      if (!isSupported || !text.trim()) {
        onEnd?.();
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance  = new SpeechSynthesisUtterance(text);
      utterance.lang   = lang;
      utterance.rate   = lang === 'de-DE' ? 0.9 : 1.0;
      utterance.pitch  = 1.05;
      utterance.volume = 1;

      const voice = getBestVoice(lang);
      if (voice) utterance.voice = voice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend   = () => {
        setIsSpeaking(false);
        queueRef.current = [];
        onEnd?.();   // ← notify caller when speech is done
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        onEnd?.();   // ← also fire on error so UI doesn't get stuck
      };

      window.speechSynthesis.speak(utterance);
    },
    [isSupported, getBestVoice]
  );

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    queueRef.current = [];
    setIsSpeaking(false);
  }, [isSupported]);

  useEffect(() => {
    return () => { if (isSupported) window.speechSynthesis.cancel(); };
  }, [isSupported]);

  return { speak, stop, isSpeaking, isSupported, voices };
};

export default useSpeechSynthesis;
