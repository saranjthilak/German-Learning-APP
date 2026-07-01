import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getRandomWords, getRandomWordsByCategory, getCategories, GermanWord } from '../../data/vocabulary';
import { SpeechManager } from '../../utils/speech';
import { StorageManager } from '../../utils/storage';
import useSpeechRecognition from '../../hooks/useSpeechRecognition';
import useSpeechSynthesis from '../../hooks/useSpeechSynthesis';

interface PronunciationGameProps {
  onComplete: (xpEarned: number, accuracy: number, correctAnswers: number, totalAnswers: number) => void;
}

// ── Phonetic normalization for smarter scoring ─────────────────────────────
const normalizePhonetic = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/\b(der|die|das)\s+/g, '') // strip articles
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const calculateSmartSimilarity = (input: string, expected: string): number => {
  // Try raw first
  const rawScore = SpeechManager.calculateSimilarity(input, expected);
  // Try phonetic-normalized
  const phoneticScore = SpeechManager.calculateSimilarity(
    normalizePhonetic(input),
    normalizePhonetic(expected)
  );
  return Math.max(rawScore, phoneticScore);
};

// ── Accuracy Ring SVG Component ──────────────────────────────────────────────
const AccuracyRing: React.FC<{ score: number; size?: number }> = ({ score, size = 100 }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444';

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="drop-shadow-lg">
      {/* Background ring */}
      <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.1)"
        strokeWidth="8" />
      {/* Score ring */}
      <circle cx="50" cy="50" r={radius} fill="none" stroke={color}
        strokeWidth="8" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.5s ease' }}
      />
      {/* Score text */}
      <text x="50" y="46" textAnchor="middle" fill={color}
        fontSize="22" fontWeight="900" fontFamily="'Nunito', sans-serif">
        {score}
      </text>
      <text x="50" y="62" textAnchor="middle" fill="rgba(255,255,255,0.5)"
        fontSize="10" fontWeight="700" fontFamily="'Nunito', sans-serif">
        accuracy
      </text>
    </svg>
  );
};

// ── Sound Wave Visualization ─────────────────────────────────────────────────
const SoundWave: React.FC<{ active: boolean }> = ({ active }) => {
  const bars = 7;
  return (
    <div className="flex items-center justify-center gap-[3px]" style={{ height: 40 }}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className="pronunciation-wave-bar"
          style={{
            height: active ? `${18 + Math.random() * 22}px` : '6px',
            animationDelay: `${i * 0.08}s`,
            animationPlayState: active ? 'running' : 'paused',
            transition: 'height 0.2s ease',
          }}
        />
      ))}
    </div>
  );
};

// ── Word Result Dots ─────────────────────────────────────────────────────────
type WordResult = 'correct' | 'incorrect' | 'pending';

const ResultDots: React.FC<{ results: WordResult[]; currentIndex: number }> = ({ results, currentIndex }) => (
  <div className="flex items-center justify-center gap-1.5 flex-wrap">
    {results.map((r, i) => (
      <div
        key={i}
        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
          i === currentIndex ? 'ring-2 ring-white/50 scale-125' : ''
        }`}
        style={{
          background:
            r === 'correct' ? '#22c55e'
            : r === 'incorrect' ? '#ef4444'
            : i === currentIndex ? 'rgba(236,72,153,0.8)'
            : 'rgba(255,255,255,0.15)',
        }}
      />
    ))}
  </div>
);

// ── Main Component ───────────────────────────────────────────────────────────
const PronunciationGame: React.FC<PronunciationGameProps> = ({ onComplete }) => {
  // ── Setup state ──────────────────────────────────────────────────────────
  const [wordsCount, setWordsCount] = useState(10);
  const [selectedCategory, setSelectedCategory] = useState<string>('Level A1');
  const [gameStarted, setGameStarted] = useState(false);

  // ── Game state ───────────────────────────────────────────────────────────
  const [words, setWords] = useState<GermanWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'close' | 'incorrect'; message: string } | null>(null);
  const [gameTime, setGameTime] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [wordResults, setWordResults] = useState<WordResult[]>([]);
  const [animKey, setAnimKey] = useState(0); // triggers re-animation on word change
  const [submitted, setSubmitted] = useState(false); // prevent double-submit

  // ── Speech hooks ─────────────────────────────────────────────────────────
  const {
    transcript, interimTranscript, isListening, isSupported,
    start: startListening, stop: stopListening, reset: resetTranscript,
  } = useSpeechRecognition();

  const { speak, stop: stopSpeaking, isSpeaking } = useSpeechSynthesis();

  // ── Refs ─────────────────────────────────────────────────────────────────
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestTranscript = useRef('');
  const submittedRef = useRef(false);
  const isRecordingRef = useRef(false);

  // Keep ref in sync
  useEffect(() => { latestTranscript.current = transcript; }, [transcript]);
  useEffect(() => { submittedRef.current = submitted; }, [submitted]);

  // ── Game timer ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gameStarted) return;
    const timer = setInterval(() => setGameTime(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, [gameStarted]);

  // ── Silence detection — auto-submit after 2s ────────────────────────────
  useEffect(() => {
    if (!isRecordingRef.current) return;
    if (silenceTimer.current) clearTimeout(silenceTimer.current);

    silenceTimer.current = setTimeout(() => {
      const current = latestTranscript.current.trim();
      if (current && !submittedRef.current) {
        handleSubmitPronunciation(current);
      }
    }, 2000);

    return () => {
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, interimTranscript]);

  // ── Start game ──────────────────────────────────────────────────────────
  const startGame = () => {
    const learnedIds = StorageManager.getUserData().learnedWords || [];
    const selectedWords = selectedCategory === 'All'
      ? getRandomWords(wordsCount, learnedIds)
      : getRandomWordsByCategory(wordsCount, selectedCategory, learnedIds);
    setWords(selectedWords);
    setWordResults(new Array(wordsCount).fill('pending'));
    setGameStarted(true);

    // Auto-play first word after a short delay
    setTimeout(() => {
      if (selectedWords.length > 0) {
        speak(selectedWords[0].german, 'de-DE');
      }
    }, 500);
  };

  // ── Speak word ──────────────────────────────────────────────────────────
  const playWord = useCallback((text: string, slow = false) => {
    stopSpeaking();
    // For slow mode, we use the speak function but modify the rate via SpeechManager directly
    if (slow) {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'de-DE';
      utterance.rate = 0.55;
      utterance.pitch = 1;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    } else {
      speak(text, 'de-DE');
    }
  }, [speak, stopSpeaking]);

  // ── Start recording ─────────────────────────────────────────────────────
  const handleStartRecording = () => {
    if (isSpeaking) stopSpeaking();
    setSubmitted(false);
    submittedRef.current = false;
    setSimilarity(null);
    setFeedback(null);
    isRecordingRef.current = true;
    resetTranscript();
    latestTranscript.current = '';
    startListening();
  };

  // ── Stop recording manually ─────────────────────────────────────────────
  const handleStopRecording = () => {
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    isRecordingRef.current = false;
    stopListening();
    const current = latestTranscript.current.trim();
    if (current && !submittedRef.current) {
      handleSubmitPronunciation(current);
    }
  };

  // ── Submit pronunciation for scoring ────────────────────────────────────
  const handleSubmitPronunciation = useCallback((spokenText: string) => {
    if (submittedRef.current) return;
    setSubmitted(true);
    submittedRef.current = true;
    isRecordingRef.current = false;
    stopListening();
    if (silenceTimer.current) clearTimeout(silenceTimer.current);

    const currentWord = words[currentIndex];
    const sim = calculateSmartSimilarity(spokenText, currentWord.german);
    setSimilarity(sim);

    if (sim >= 80) {
      // Correct!
      setCorrectAnswers(prev => prev + 1);
      setStreak(prev => prev + 1);
      StorageManager.markWordLearned(currentWord.id);
      StorageManager.addWeakWord(currentWord.id, true);
      setFeedback({ type: 'correct', message: streak >= 2 ? `🔥 ${streak + 1}x Streak! Excellent!` : '✓ Excellent pronunciation!' });
      setWordResults(prev => { const n = [...prev]; n[currentIndex] = 'correct'; return n; });
      setAttempts(0);

      setTimeout(() => advanceWord(), 2000);
    } else {
      StorageManager.addWeakWord(currentWord.id, false);
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);

      if (nextAttempts >= 3) {
        setStreak(0);
        setFeedback({ type: 'incorrect', message: '✗ 3 attempts used. Moving on...' });
        setWordResults(prev => { const n = [...prev]; n[currentIndex] = 'incorrect'; return n; });
        setTimeout(() => advanceWord(), 2500);
      } else {
        if (sim >= 60) {
          setFeedback({ type: 'close', message: `~ Close! Try again (${nextAttempts}/3)` });
        } else {
          setFeedback({ type: 'incorrect', message: `✗ Not quite right (${nextAttempts}/3)` });
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words, currentIndex, attempts, streak, stopListening]);

  // ── Advance to next word ────────────────────────────────────────────────
  const advanceWord = () => {
    if (currentIndex + 1 < wordsCount) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      resetTranscript();
      latestTranscript.current = '';
      setSimilarity(null);
      setFeedback(null);
      setAttempts(0);
      setShowTranslation(false);
      setShowAnswer(false);
      setSubmitted(false);
      submittedRef.current = false;
      setAnimKey(prev => prev + 1);

      // Auto-play next word
      setTimeout(() => {
        if (words[nextIdx]) {
          speak(words[nextIdx].german, 'de-DE');
        }
      }, 400);
    } else {
      completeGame();
    }
  };

  // ── Skip word ──────────────────────────────────────────────────────────
  const handleSkip = () => {
    setStreak(0);
    setWordResults(prev => { const n = [...prev]; n[currentIndex] = 'incorrect'; return n; });
    setAttempts(0);
    advanceWord();
  };

  // ── Complete game ──────────────────────────────────────────────────────
  const completeGame = () => {
    stopListening();
    stopSpeaking();
    const accuracy = Math.round((correctAnswers / wordsCount) * 100);
    const xpEarned = Math.round((correctAnswers / wordsCount) * 60);
    onComplete(xpEarned, accuracy, correctAnswers, wordsCount);
  };

  // ── Cleanup on unmount ─────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
    };
  }, []);

  // ══════════════════════════════════════════════════════════════════════════
  // SETUP SCREEN
  // ══════════════════════════════════════════════════════════════════════════
  if (!gameStarted) {
    const categories = getCategories();

    return (
      <div className="animate-slide-up" style={{ maxWidth: 520, margin: '0 auto' }}>
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-3 animate-float">🎤</div>
          <h1 className="text-3xl font-black mb-1"
            style={{ background: 'linear-gradient(135deg, #ec4899, #f43f5e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Pronunciation Challenge
          </h1>
          <p className="text-sm opacity-50">Listen, speak, and master German pronunciation</p>
        </div>

        {/* Mic warning */}
        {!isSupported && (
          <div className="mb-4 rounded-xl px-4 py-2.5 text-xs text-center"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
            ⚠️ Your browser doesn't support voice input. Please use <strong>Chrome</strong> or <strong>Edge</strong>.
          </div>
        )}

        <div className="mb-4 rounded-xl px-4 py-2.5 text-xs text-center"
          style={{ background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.2)', color: '#f472b6' }}>
          🎙️ Make sure your microphone is enabled and working
        </div>

        {/* Category selector */}
        <div className="rounded-2xl p-4 mb-4 border border-white/5" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <h3 className="font-black mb-3 text-xs tracking-wider uppercase opacity-60">Select Category</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className="py-2 px-3 text-xs font-bold rounded-xl transition-all duration-150 tactile-btn"
                style={{
                  background: selectedCategory === category ? 'rgba(236,72,153,0.2)' : 'rgba(255,255,255,0.04)',
                  border: selectedCategory === category ? '2px solid #ec4899' : '2px solid transparent',
                  color: selectedCategory === category ? 'white' : 'rgba(255,255,255,0.45)',
                }}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Word count selector */}
        <div className="rounded-2xl p-4 mb-6 border border-white/5" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <h3 className="font-black mb-3 text-xs tracking-wider uppercase opacity-60">Number of Words</h3>
          <div className="grid grid-cols-4 gap-3">
            {[5, 10, 15, 20].map(count => (
              <button
                key={count}
                onClick={() => setWordsCount(count)}
                className="py-3 font-black text-sm rounded-xl transition-all duration-150 tactile-btn"
                style={{
                  background: wordsCount === count ? 'rgba(236,72,153,0.2)' : 'rgba(255,255,255,0.04)',
                  border: wordsCount === count ? '2px solid #ec4899' : '2px solid transparent',
                  color: wordsCount === count ? 'white' : 'rgba(255,255,255,0.45)',
                }}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        {/* Start button */}
        <button
          id="start-pronunciation-btn"
          onClick={startGame}
          disabled={!isSupported}
          className="w-full py-4 rounded-xl text-sm font-black text-white transition-all duration-200 tactile-btn"
          style={{
            background: !isSupported
              ? 'rgba(255,255,255,0.05)'
              : 'linear-gradient(135deg, #ec4899 0%, #f43f5e 50%, #ec4899 100%)',
            backgroundSize: '200% auto',
            boxShadow: !isSupported ? 'none' : '0 8px 24px rgba(236, 72, 153, 0.3)',
            cursor: !isSupported ? 'not-allowed' : 'pointer',
          }}
        >
          🎤 Start Pronunciation Challenge
        </button>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GAME SCREEN
  // ══════════════════════════════════════════════════════════════════════════
  const currentWord = words[currentIndex];
  const progressPercent = ((currentIndex) / wordsCount) * 100;
  const isRecording = isListening && isRecordingRef.current;
  const displayTranscript = transcript || '';
  const displayInterim = interimTranscript || '';

  return (
    <div className="space-y-5" style={{ maxWidth: 520, margin: '0 auto' }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black"
            style={{ background: 'linear-gradient(135deg, #ec4899, #f43f5e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            🎤 Pronunciation
          </h1>
          <p className="text-xs opacity-40">Word {currentIndex + 1} of {wordsCount}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Streak badge */}
          {streak > 0 && (
            <div className="animate-streak-pop flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black"
              style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316', border: '1px solid rgba(249,115,22,0.3)' }}>
              🔥 {streak}
            </div>
          )}
          <div className="text-right">
            <p className="text-xl font-black" style={{ color: '#ec4899' }}>{correctAnswers}/{currentIndex}</p>
            <p className="text-[10px] opacity-40">{Math.floor(gameTime / 60)}:{String(gameTime % 60).padStart(2, '0')}</p>
          </div>
        </div>
      </div>

      {/* ── Progress Bar ────────────────────────────────────────────────── */}
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${progressPercent}%`,
            background: 'linear-gradient(90deg, #ec4899, #f43f5e)',
          }}
        />
      </div>

      {/* ── Word Result Dots ─────────────────────────────────────────── */}
      <ResultDots results={wordResults} currentIndex={currentIndex} />

      {/* ── Feedback Banner ──────────────────────────────────────────── */}
      {feedback && (
        <div className={`px-4 py-3 rounded-xl text-center font-black text-sm animate-bounce-in ${
          feedback.type === 'correct'
            ? '' : feedback.type === 'close' ? '' : ''
        }`}
          style={{
            background:
              feedback.type === 'correct' ? 'rgba(34,197,94,0.15)'
              : feedback.type === 'close' ? 'rgba(234,179,8,0.15)'
              : 'rgba(239,68,68,0.15)',
            border: `1px solid ${
              feedback.type === 'correct' ? 'rgba(34,197,94,0.3)'
              : feedback.type === 'close' ? 'rgba(234,179,8,0.3)'
              : 'rgba(239,68,68,0.3)'
            }`,
            color:
              feedback.type === 'correct' ? '#4ade80'
              : feedback.type === 'close' ? '#fbbf24'
              : '#f87171',
          }}>
          {feedback.message}
        </div>
      )}

      {/* ── Word Card ────────────────────────────────────────────────── */}
      <div key={animKey} className="animate-word-slide-in rounded-2xl p-6 text-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(236,72,153,0.08), rgba(244,63,94,0.05))',
          border: '1.5px solid rgba(236,72,153,0.2)',
          boxShadow: '0 8px 32px rgba(236,72,153,0.08)',
        }}>
        {/* Article badge */}
        {currentWord.article && (
          <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
            style={{ background: 'rgba(236,72,153,0.15)', color: '#f472b6' }}>
            {currentWord.article}
          </div>
        )}

        {/* Attempt counter */}
        {attempts > 0 && (
          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-black"
            style={{ background: 'rgba(249,115,22,0.15)', color: '#fb923c' }}>
            {attempts}/3
          </div>
        )}

        <p className="text-xs opacity-40 mt-2 mb-2">Say this word:</p>

        <h2 className="text-4xl sm:text-5xl font-black mb-3"
          style={{ color: '#ec4899' }}>
          {currentWord.german}
        </h2>

        {/* Pronunciation guide */}
        <div className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-4"
          style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' }}>
          🔤 {currentWord.pronunciation}
        </div>

        {/* English translation (hidden by default) */}
        <div className="mb-3">
          {showTranslation ? (
            <p className="text-xs animate-fade-in-scale" style={{ color: 'rgba(255,255,255,0.5)' }}>
              📝 {currentWord.english}
            </p>
          ) : (
            <button onClick={() => setShowTranslation(true)}
              className="text-[10px] font-bold transition-colors hover:opacity-80"
              style={{ color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer' }}>
              👁️ Show English
            </button>
          )}
        </div>

        {/* Listen buttons */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => playWord(currentWord.german, false)}
            disabled={isSpeaking}
            className="px-4 py-2 rounded-xl text-xs font-black transition-all tactile-btn"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white',
              boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
              cursor: isSpeaking ? 'wait' : 'pointer',
            }}>
            🔊 Listen
          </button>
          <button
            onClick={() => playWord(currentWord.german, true)}
            disabled={isSpeaking}
            className="px-4 py-2 rounded-xl text-xs font-black transition-all tactile-btn"
            style={{
              background: 'rgba(99,102,241,0.12)',
              color: '#a5b4fc',
              border: '1px solid rgba(99,102,241,0.2)',
              cursor: isSpeaking ? 'wait' : 'pointer',
            }}>
            🐢 Slow
          </button>
        </div>
      </div>

      {/* ── Sound Wave + Recording ────────────────────────────────────── */}
      <div className="text-center space-y-3">
        <SoundWave active={isRecording} />

        <button
          id="record-btn"
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          disabled={isSpeaking}
          className="w-full py-5 rounded-xl font-black text-base transition-all duration-200 tactile-btn relative overflow-hidden"
          style={{
            background: isRecording
              ? 'linear-gradient(135deg, #ef4444, #dc2626)'
              : 'linear-gradient(135deg, #ec4899 0%, #f43f5e 50%, #ec4899 100%)',
            backgroundSize: '200% auto',
            color: 'white',
            boxShadow: isRecording
              ? '0 0 0 0 rgba(239, 68, 68, 0.4)'
              : '0 8px 24px rgba(236, 72, 153, 0.25)',
            animation: isRecording ? 'mic-pulse 1.5s infinite' : 'none',
            cursor: isSpeaking ? 'wait' : 'pointer',
          }}
        >
          {isRecording ? '⏹ Stop Recording' : '🎤 Click to Speak'}
        </button>

        {/* Hint text */}
        <p className="text-[10px] opacity-30">
          {isRecording ? 'Listening... will auto-submit after 2s of silence' : 'Tap to start recording your pronunciation'}
        </p>
      </div>

      {/* ── Transcript + Accuracy ────────────────────────────────────── */}
      {(displayTranscript || displayInterim) && (
        <div className="rounded-xl p-4 space-y-3"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>

          {/* What user said */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-40 mb-1">You said:</p>
            <p className="font-black text-base">
              {displayTranscript}
              {displayInterim && (
                <span className="opacity-50 italic"> {displayInterim}…</span>
              )}
            </p>
          </div>

          {/* Accuracy gauge */}
          {similarity !== null && (
            <div className="flex items-center justify-center pt-2">
              <AccuracyRing score={similarity} size={90} />
            </div>
          )}
        </div>
      )}

      {/* ── Reveal Answer (after 2 failed attempts) ──────────────────── */}
      {attempts >= 2 && !showAnswer && !feedback?.type?.includes('correct') && (
        <button
          onClick={() => {
            setShowAnswer(true);
            playWord(currentWord.german, true);
          }}
          className="w-full py-3 rounded-xl text-xs font-black transition-all tactile-btn"
          style={{
            background: 'rgba(234,179,8,0.1)',
            border: '1px solid rgba(234,179,8,0.2)',
            color: '#fbbf24',
            cursor: 'pointer',
          }}>
          💡 Reveal Correct Pronunciation
        </button>
      )}

      {showAnswer && (
        <div className="rounded-xl p-3 text-center animate-fade-in-scale"
          style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.15)' }}>
          <p className="text-[10px] font-bold text-yellow-500 mb-1">Correct pronunciation:</p>
          <p className="font-black text-lg text-yellow-400">{currentWord.german}</p>
          <p className="text-xs opacity-50 mt-1">🔤 {currentWord.pronunciation}</p>
          <button onClick={() => playWord(currentWord.german, true)}
            className="mt-2 text-[10px] font-bold transition-colors"
            style={{ color: '#fbbf24', background: 'none', border: 'none', cursor: 'pointer' }}>
            🐢 Listen slowly
          </button>
        </div>
      )}

      {/* ── Skip / Next Button ────────────────────────────────────────── */}
      {(feedback && similarity !== null && similarity < 80 && attempts < 3) && (
        <button
          onClick={handleSkip}
          className="w-full py-3 rounded-xl text-xs font-bold transition-all"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer',
          }}>
          → Skip to Next Word
        </button>
      )}

      {/* Inline mic-pulse keyframe (same pattern as VoiceTutor) */}
      <style>{`
        @keyframes mic-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(236,72,153,0.5); }
          70%  { box-shadow: 0 0 0 14px rgba(236,72,153,0); }
          100% { box-shadow: 0 0 0 0 rgba(236,72,153,0); }
        }
      `}</style>
    </div>
  );
};

export default PronunciationGame;
