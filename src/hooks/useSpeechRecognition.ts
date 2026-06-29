// ─────────────────────────────────────────────────────────────────────────────
// useSpeechRecognition — wraps the Web Speech API
//
// KEY DESIGN: We keep ONE SpeechRecognition session alive for the entire
// component lifecycle (keepAlive mode). Instead of destroying and rebuilding the
// session each turn — which takes 500ms-2s of browser init time — we use an
// "active" gate flag. When the gate is open, transcripts accumulate. When closed,
// they are dropped. This eliminates the "activating…" stuck state entirely.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';

export type SpeechError =
  | 'not-supported'
  | 'permission-denied'
  | 'no-speech'
  | 'network'
  | 'unknown';

export interface UseSpeechRecognitionReturn {
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
  isSupported: boolean;
  error: SpeechError | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

// Detect English words mixed in German speech
const STRUGGLE_SIGNALS = [
  "i don't know",
  "i dont know",
  'what is',
  'how do you say',
  'how to say',
  'i forgot',
  'i don\'t remember',
  'help',
  'umm',
  'ummm',
  'uhh',
  'uhhh',
  'i need help',
  'what does',
];

export const detectStruggle = (text: string): boolean => {
  const lower = text.toLowerCase();
  return STRUGGLE_SIGNALS.some((s) => lower.includes(s));
};

// Rough heuristic: check if the text has significant English words
export const hasEnglishWords = (text: string): boolean => {
  const englishWords = [
    'the', 'and', 'is', 'are', 'was', 'were', 'have', 'has',
    'will', 'would', 'can', 'could', 'should', 'want', 'need',
    'going', 'went', 'come', 'came', 'think', 'know', 'like',
    'shopping', 'restaurant', 'hotel', 'airport', 'hospital',
    'tomorrow', 'yesterday', 'because', 'maybe', 'really',
  ];
  const words = text.toLowerCase().split(/\s+/);
  const englishCount = words.filter((w) => englishWords.includes(w)).length;
  return englishCount >= 2 || (words.length <= 4 && englishCount >= 1);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useSpeechRecognition = (): UseSpeechRecognitionReturn => {
  const [transcript, setTranscript]               = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening]             = useState(false);
  const [error, setError]                         = useState<SpeechError | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef  = useRef<any>(null);
  const isActiveRef     = useRef(false);  // gate: only accumulate when open
  const isStartedRef    = useRef(false);  // track whether rec.start() was called

  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // ── Build and boot a single persistent recognition session ────────────────
  const initRecognition = useCallback(() => {
    if (!isSupported || recognitionRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SR();
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.lang            = 'de-DE';
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      isStartedRef.current = true;
    };

    // Auto-restart on end if session should still be alive
    rec.onend = () => {
      isStartedRef.current = false;
      if (isActiveRef.current) {
        // The browser stopped on its own (timeout etc.) — restart immediately
        try {
          rec.start();
        } catch (_) { /* ignore */ }
      } else {
        setIsListening(false);
        setInterimTranscript('');
      }
    };

    rec.onresult = (e: any) => {
      // Drop results when gate is closed (Lena is speaking / thinking)
      if (!isActiveRef.current) return;

      let interim = '';
      let final   = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) {
          final += res[0].transcript;
        } else {
          interim += res[0].transcript;
        }
      }
      if (final)   setTranscript((prev) => (prev + ' ' + final).trim());
      if (interim) setInterimTranscript(interim);
    };

    rec.onerror = (e: any) => {
      if (e.error === 'not-allowed')    setError('permission-denied');
      else if (e.error === 'no-speech') return; // ignore, auto-restarts via onend
      else if (e.error === 'network')   setError('network');
      else if (e.error === 'aborted')   return; // expected on stop
      else setError('unknown');
    };

    recognitionRef.current = rec;

    // Start once — will auto-restart in onend
    try {
      rec.start();
      isStartedRef.current = true;
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
    }
  }, [isSupported]);

  // ── Open the gate — user can now speak ───────────────────────────────────
  const start = useCallback(() => {
    if (!isSupported) {
      setError('not-supported');
      return;
    }
    setError(null);
    setTranscript('');
    setInterimTranscript('');

    isActiveRef.current = true;
    setIsListening(true);

    if (!recognitionRef.current) {
      initRecognition();
    } else if (!isStartedRef.current) {
      // Session was stopped by browser; restart it
      try {
        recognitionRef.current.start();
        isStartedRef.current = true;
      } catch (e) {
        console.warn('Could not restart recognition:', e);
      }
    }
    // If already running, just opening the gate is enough — results will flow in
  }, [isSupported, initRecognition]);

  // ── Close the gate — suppress incoming speech ─────────────────────────────
  const stop = useCallback(() => {
    isActiveRef.current = false;
    setIsListening(false);
    setInterimTranscript('');
    // We intentionally do NOT call rec.stop() — we keep the session warm
    // so the next turn starts instantly with no browser init delay
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  // ── Tear down the session when the component unmounts ─────────────────────
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_) { /* ignore */ }
        recognitionRef.current = null;
      }
    };
  }, []);

  return { transcript, interimTranscript, isListening, isSupported, error, start, stop, reset };
};

export default useSpeechRecognition;
