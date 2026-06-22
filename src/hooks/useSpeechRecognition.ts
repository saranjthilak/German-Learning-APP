// ─────────────────────────────────────────────────────────────────────────────
// useSpeechRecognition — wraps the Web Speech API for continuous listening
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
  const [transcript, setTranscript]             = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening]           = useState(false);
  const [error, setError]                       = useState<SpeechError | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const isSupported    = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const buildRecognition = useCallback(() => {
    if (!isSupported) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SR();
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.lang            = 'de-DE';
    rec.maxAlternatives = 1;
    return rec;
  }, [isSupported]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const start = useCallback(() => {
    if (!isSupported) {
      setError('not-supported');
      return;
    }
    setError(null);
    setTranscript('');
    setInterimTranscript('');

    const rec = buildRecognition()!;
    recognitionRef.current = rec;

    rec.onstart = () => setIsListening(true);
    rec.onend   = () => setIsListening(false);

    rec.onresult = (e: any) => {
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
      if (e.error === 'not-allowed')  setError('permission-denied');
      else if (e.error === 'no-speech') setError('no-speech');
      else if (e.error === 'network')   setError('network');
      else setError('unknown');
      setIsListening(false);
    };

    rec.start();
  }, [isSupported, buildRecognition]);

  const reset = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return () => (recognitionRef.current as any)?.stop();
  }, []);

  return { transcript, interimTranscript, isListening, isSupported, error, start, stop, reset };
};

export default useSpeechRecognition;
