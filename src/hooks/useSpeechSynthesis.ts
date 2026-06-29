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

// Keep a module-level reference to prevent garbage collection of utterances while they are speaking (legendary Chrome/Safari bug)
const activeUtterances = new Set<SpeechSynthesisUtterance>();

const useSpeechSynthesis = (): UseSpeechSynthesisReturn => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices]         = useState<SpeechSynthesisVoice[]>([]);
  const queueRef                    = useRef<SpeechSynthesisUtterance[]>([]);
  const isSupported                 = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const fallbackTimerRef            = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      
      // To minimize text-to-speech startup lag, prioritize local service voices
      const localVoice = voices.find(
        (v) => v.lang.toLowerCase().startsWith(langCode.slice(0, 2)) && v.localService
      );
      if (localVoice) return localVoice;

      // Fallback to "neural" / "natural" cloud-based voices for quality if local is not found
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
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      
      if (!isSupported || !text.trim()) {
        onEnd?.();
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      activeUtterances.clear();

      const utterance  = new SpeechSynthesisUtterance(text);
      utterance.lang   = lang;
      utterance.rate   = lang === 'de-DE' ? 0.9 : 1.0;
      utterance.pitch  = 1.05;
      utterance.volume = 1;

      const voice = getBestVoice(lang);
      if (voice) utterance.voice = voice;

      // Cache the utterance globally to prevent GC
      activeUtterances.add(utterance);

      const triggerEnd = () => {
        if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
        activeUtterances.delete(utterance);
        setIsSpeaking(false);
        queueRef.current = [];
        onEnd?.();
      };

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend   = () => {
        triggerEnd();
      };
      utterance.onerror = () => {
        triggerEnd();
      };

      // Dual safety: calculate estimated speaking duration to trigger fallback in case onend never fires
      const estimatedWords = text.split(/\s+/).length;
      const estimatedDurationMs = (estimatedWords * 650) + 2000; // 650ms per word + 2s padding

      fallbackTimerRef.current = setTimeout(() => {
        if (activeUtterances.has(utterance)) {
          console.warn("SpeechSynthesis onend failed to fire. Recovering via fallback timer.");
          triggerEnd();
        }
      }, estimatedDurationMs);

      window.speechSynthesis.speak(utterance);
    },
    [isSupported, getBestVoice]
  );

  const stop = useCallback(() => {
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    activeUtterances.clear();
    queueRef.current = [];
    setIsSpeaking(false);
  }, [isSupported]);

  useEffect(() => {
    return () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      if (isSupported) window.speechSynthesis.cancel();
    };
  }, [isSupported]);

  return { speak, stop, isSpeaking, isSupported, voices };
};

export default useSpeechSynthesis;
