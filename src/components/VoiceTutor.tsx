import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TutorMessage, TutorSession, ProficiencyLevel, ConversationTopic } from '../types';
import {
  sendMessage,
  getTopicStarter,
  getStoredApiKey,
  detectStruggle,
  hasEnglishWords,
  ChatMessage,
} from '../utils/openai';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import useSpeechSynthesis from '../hooks/useSpeechSynthesis';
import { StorageManager } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
import { saveCloudData } from '../contexts/AuthContext';

// ── Constants ─────────────────────────────────────────────────────────────────

const TOPICS: { id: ConversationTopic; label: string; icon: string; color: string }[] = [
  { id: 'daily-conversation', label: 'Daily Chat',      icon: '💬', color: '#6366f1' },
  { id: 'restaurant',         label: 'Restaurant',      icon: '🍽️', color: '#f59e0b' },
  { id: 'shopping',           label: 'Shopping',        icon: '🛍️', color: '#ec4899' },
  { id: 'airport',            label: 'Airport',         icon: '✈️', color: '#3b82f6' },
  { id: 'hotel',              label: 'Hotel',           icon: '🏨', color: '#8b5cf6' },
  { id: 'job-interview',      label: 'Job Interview',   icon: '💼', color: '#10b981' },
  { id: 'doctor-visit',       label: 'Doctor Visit',    icon: '🏥', color: '#ef4444' },
  { id: 'office-meeting',     label: 'Office Meeting',  icon: '🖥️', color: '#06b6d4' },
  { id: 'travel',             label: 'Travel',          icon: '🗺️', color: '#f97316' },
  { id: 'friends-and-family', label: 'Friends & Family',icon: '👨‍👩‍👧', color: '#84cc16' },
];

const LEVELS: { id: ProficiencyLevel; label: string; desc: string }[] = [
  { id: 'A1', label: 'A1', desc: 'Beginner — simple words' },
  { id: 'A2', label: 'A2', desc: 'Elementary — basic phrases' },
  { id: 'B1', label: 'B1', desc: 'Intermediate — conversations' },
  { id: 'B2', label: 'B2', desc: 'Upper-intermediate' },
  { id: 'C1', label: 'C1', desc: 'Advanced — near fluent' },
];

// ── Types ─────────────────────────────────────────────────────────────────────

type TutorPhase = 'setup' | 'session' | 'summary';
type AIStatus = 'idle' | 'thinking' | 'speaking' | 'listening' | 'error';

interface VoiceTutorProps {
  onClose: () => void;
}

// ── Helper ────────────────────────────────────────────────────────────────────

const formatDuration = (secs: number): string => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

// ── Component ─────────────────────────────────────────────────────────────────

const VoiceTutor: React.FC<VoiceTutorProps> = ({ onClose }) => {
  const { user } = useAuth();
  const userData = StorageManager.getUserData();

  // ── Setup state ──────────────────────────────────────────────────────────
  const [phase, setPhase]       = useState<TutorPhase>('setup');
  const [topic, setTopic]       = useState<ConversationTopic>('daily-conversation');
  const [level, setLevel]       = useState<ProficiencyLevel>('A1');
  const [apiKey]                = useState<string>(getStoredApiKey());

  // ── Session state ────────────────────────────────────────────────────────
  const [messages, setMessages]       = useState<TutorMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [aiStatus, setAiStatus]       = useState<AIStatus>('idle');
  const [elapsed, setElapsed]         = useState(0);
  const [struggleCount, setStruggleCount] = useState(0);
  const [errorMsg, setErrorMsg]       = useState('');
  const [isMyTurn, setIsMyTurn]       = useState(false);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const startTimeRef       = useRef<Date>(new Date());
  const timerRef           = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatBottomRef      = useRef<HTMLDivElement>(null);
  const silenceTimer       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestTranscript   = useRef('');   // always current — avoids stale closure
  const chatHistoryRef     = useRef<ChatMessage[]>([]);  // same for history
  const isMyTurnRef        = useRef(false);

  // ── Hooks ────────────────────────────────────────────────────────────────
  const {
    transcript, interimTranscript, isListening, isSupported,
    start: startListening, stop: stopListening, reset: resetTranscript,
  } = useSpeechRecognition();

  const { speak, stop: stopSpeaking } = useSpeechSynthesis();

  // Keep refs in sync with state so callbacks don't go stale
  useEffect(() => { latestTranscript.current = transcript; }, [transcript]);
  useEffect(() => { chatHistoryRef.current = chatHistory; }, [chatHistory]);
  useEffect(() => { isMyTurnRef.current = isMyTurn; }, [isMyTurn]);

  // ── Scroll to bottom ─────────────────────────────────────────────────────
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimTranscript]);

  // ── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'session') return;
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  // ── Silence detection — auto-send after 5s of silence (uses ref to avoid stale closure)
  useEffect(() => {
    if (!isListening || !isMyTurn) return;
    // Clear and reset timer every time transcript changes
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    silenceTimer.current = setTimeout(() => {
      if (!isMyTurnRef.current) return;  // already submitted
      const current = latestTranscript.current.trim();
      if (current) {
        handleUserSubmit(current);
      }
      // If nothing was said, just keep waiting — don't spam the AI
    }, 5000);
    return () => { if (silenceTimer.current) clearTimeout(silenceTimer.current); };
  }, [transcript, isListening, isMyTurn]);

  // ── startUserTurn — called when Lena finishes speaking ───────────────────
  const startUserTurn = useCallback(() => {
    setAiStatus('listening');
    setIsMyTurn(true);
    isMyTurnRef.current = true;
    resetTranscript();
    latestTranscript.current = '';
    startListening();
  }, [resetTranscript, startListening]);

  // ── AI response handler ──────────────────────────────────────────────────
  const handleAIResponse = useCallback(async (history: ChatMessage[]) => {
    setAiStatus('thinking');
    setIsMyTurn(false);
    isMyTurnRef.current = false;
    try {
      const response = await sendMessage(history, level, topic, userData.playerName);

      const aiMsg: TutorMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response.text,
        language: response.language,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setChatHistory((prev) => {
        const updated = [...prev, { role: 'model' as const, content: response.text }];
        chatHistoryRef.current = updated;
        return updated;
      });

      // Speak — then hand off to user via onEnd callback (NO useEffect race condition)
      setAiStatus('speaking');
      speak(
        response.text,
        response.hasEnglishHelp ? 'en-US' : 'de-DE',
        startUserTurn   // ← fires when TTS finishes
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'API_ERROR';
      if (msg === 'NO_API_KEY' || msg === 'INVALID_API_KEY') {
        setErrorMsg('Please add a valid Gemini API key in Settings ⚙️ to use the AI Tutor.');
      } else if (msg === 'RATE_LIMIT') {
        setErrorMsg('Gemini rate limit reached. Please wait a moment and try again.');
      } else if (msg === 'MODEL_NOT_FOUND') {
        setErrorMsg('This Gemini model is not available. Go to Settings ⚙️ and switch to “gemini-2.5-flash”.');
      } else if (msg.startsWith('BLOCKED_BY_SAFETY')) {
        setErrorMsg(`Conversation blocked by Gemini safety filters: ${msg.split(': ')[1] || 'Unknown reason'}`);
      } else if (msg === 'NO_CANDIDATES_RETURNED') {
        setErrorMsg('Gemini returned an empty response with no candidates. Please verify your API key or model settings.');
      } else if (msg.startsWith('FINISHED_WITH_REASON_')) {
        setErrorMsg(`Gemini generation stopped prematurely: ${msg.replace('FINISHED_WITH_REASON_', '')}`);
      } else if (msg === 'EMPTY_TEXT_IN_RESPONSE') {
        setErrorMsg('Gemini returned an empty response text.');
      } else {
        setErrorMsg(`AI error: ${msg}`);
      }
      setAiStatus('error');
      setIsMyTurn(true);
      isMyTurnRef.current = true;
    }
  }, [level, topic, userData.playerName, speak, startUserTurn]);

  // REMOVED: the broken isSpeaking useEffect that caused the race condition

  // ── User submits their speech ────────────────────────────────────────────
  const handleUserSubmit = useCallback(async (text: string) => {
    if (!text.trim()) return;
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    stopListening();
    setIsMyTurn(false);
    isMyTurnRef.current = false;
    latestTranscript.current = '';

    const struggle = detectStruggle(text) || hasEnglishWords(text);
    if (struggle) setStruggleCount((c) => c + 1);

    const userMsg: TutorMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      language: hasEnglishWords(text) ? 'mixed' : 'german',
      timestamp: new Date().toISOString(),
      hadStruggle: struggle,
    };
    setMessages((prev) => [...prev, userMsg]);

    // Use ref value to avoid stale closure
    const newHistory: ChatMessage[] = [...chatHistoryRef.current, { role: 'user' as const, content: text }];
    setChatHistory(newHistory);
    chatHistoryRef.current = newHistory;
    resetTranscript();

    await handleAIResponse(newHistory);
  }, [stopListening, resetTranscript, handleAIResponse]);

  // ── Start session ────────────────────────────────────────────────────────
  const startSession = useCallback(async () => {
    if (!apiKey) { setErrorMsg('Please add your Gemini API key in Settings ⚙️ first.'); return; }
    if (!isSupported) { setErrorMsg('Your browser does not support voice input. Please use Chrome or Edge.'); return; }

    setPhase('session');
    startTimeRef.current = new Date();
    setElapsed(0);
    setMessages([]);
    setChatHistory([]);
    chatHistoryRef.current = [];
    setStruggleCount(0);
    setErrorMsg('');
    setIsMyTurn(false);
    isMyTurnRef.current = false;

    const starter = getTopicStarter(topic);
    const starterMsg: TutorMessage = {
      id: 'intro', role: 'assistant', content: starter,
      language: 'german', timestamp: new Date().toISOString(),
    };
    const initialHistory: ChatMessage[] = [{ role: 'model' as const, content: starter }];
    setMessages([starterMsg]);
    setChatHistory(initialHistory);
    chatHistoryRef.current = initialHistory;

    // Speak opener — startUserTurn fires via onEnd callback when done
    setAiStatus('speaking');
    speak(starter, 'de-DE', startUserTurn);
  }, [apiKey, isSupported, topic, speak, startUserTurn]);

  // ── End session ──────────────────────────────────────────────────────────
  const endSession = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    stopListening();
    stopSpeaking();

    const durationSeconds = elapsed;
    const xpEarned = Math.min(200, Math.round(durationSeconds / 10) * 5 + messages.filter(m => m.role === 'user').length * 3);

    const session: TutorSession = {
      id: Date.now().toString(),
      topic,
      level,
      startedAt: startTimeRef.current.toISOString(),
      endedAt: new Date().toISOString(),
      durationSeconds,
      messages,
      wordsUsed: [],
      struggleCount,
      xpEarned,
    };

    const updated = StorageManager.saveTutorSession(session);
    if (user) saveCloudData(user.uid, updated);

    setPhase('summary');
  }, [elapsed, messages, topic, level, struggleCount, stopListening, stopSpeaking, user]);

  // ── Mic button press (manual send) ──────────────────────────────────────
  const handleMicPress = () => {
    if (!isMyTurn) return;
    const text = latestTranscript.current.trim();
    if (text) {
      handleUserSubmit(text);
    } else {
      // Nothing spoken yet — keep listening
    }
  };

  // ── Text input fallback state ────────────────────────────────────────────
  const [textInput, setTextInput] = useState('');
  const handleTextSend = () => {
    if (!textInput.trim() || !isMyTurn) return;
    const text = textInput.trim();
    setTextInput('');
    handleUserSubmit(text);
  };

  // ── Current topic info ───────────────────────────────────────────────────
  const currentTopic = TOPICS.find((t) => t.id === topic)!;

  // ─────────────────────────────────────────────────────────────────────────
  // SETUP PHASE
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="text-6xl mb-3">🎙️</div>
            <h1 className="text-4xl font-bold text-white mb-2">AI Voice Tutor</h1>
            <p className="text-blue-300 text-lg">Speak German with your personal AI tutor, Lena</p>
          </div>

          {/* API key warning */}
          {!apiKey && (
            <div className="mb-6 rounded-2xl px-5 py-4 text-sm"
              style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)', color: '#fbbf24' }}>
              ⚠️ No Gemini API key found. Go to <strong>Settings ⚙️</strong> and add your key before starting.
            </div>
          )}

          {/* Browser support warning */}
          {!isSupported && (
            <div className="mb-6 rounded-2xl px-5 py-4 text-sm"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
              ⚠️ Your browser doesn't support voice input. Please use <strong>Chrome</strong> or <strong>Edge</strong>.
            </div>
          )}

          <div className="space-y-6">
            {/* Topic selector */}
            <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="text-white font-bold mb-4 text-lg">Choose a Topic</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {TOPICS.map((t) => (
                  <button key={t.id} id={`topic-${t.id}`}
                    onClick={() => setTopic(t.id)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-semibold transition-all duration-150"
                    style={{
                      background: topic === t.id ? `${t.color}33` : 'rgba(255,255,255,0.04)',
                      border: topic === t.id ? `2px solid ${t.color}` : '2px solid transparent',
                      color: topic === t.id ? 'white' : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    <span className="text-2xl">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Level selector */}
            <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="text-white font-bold mb-4 text-lg">Your Level</h3>
              <div className="grid grid-cols-5 gap-2">
                {LEVELS.map((l) => (
                  <button key={l.id} id={`level-${l.id}`}
                    onClick={() => setLevel(l.id)}
                    className="flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-150"
                    style={{
                      background: level === l.id ? 'rgba(99,179,237,0.2)' : 'rgba(255,255,255,0.04)',
                      border: level === l.id ? '2px solid #63b3ed' : '2px solid transparent',
                      color: level === l.id ? 'white' : 'rgba(255,255,255,0.45)',
                    }}
                  >
                    <span className="text-lg font-bold">{l.label}</span>
                    <span className="text-xs text-center leading-tight opacity-70">{l.desc.split('—')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Start button */}
            <button id="start-session-btn"
              onClick={startSession}
              disabled={!apiKey || !isSupported}
              className="w-full py-5 rounded-2xl text-xl font-bold text-white transition-all duration-200"
              style={{
                background: (!apiKey || !isSupported)
                  ? 'rgba(255,255,255,0.1)'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: (!apiKey || !isSupported) ? 'none' : '0 8px 32px rgba(102,126,234,0.4)',
                cursor: (!apiKey || !isSupported) ? 'not-allowed' : 'pointer',
              }}
            >
              {currentTopic.icon} Start Conversation
            </button>

            <button onClick={onClose} className="w-full py-3 rounded-xl text-sm"
              style={{ color: 'rgba(255,255,255,0.35)' }}>
              ← Back to games
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SUMMARY PHASE
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'summary') {
    const userMsgs = messages.filter((m) => m.role === 'user').length;
    const xpEarned = Math.min(200, Math.round(elapsed / 10) * 5 + userMsgs * 3);
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>
        <div className="w-full max-w-md text-center">
          <div className="text-7xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-white mb-2">Great Session!</h2>
          <p className="text-blue-300 mb-8">Du hast fantastisch gesprochen!</p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            {[
              { label: 'Speaking Time', value: formatDuration(elapsed), icon: '⏱' },
              { label: 'XP Earned',     value: `+${xpEarned}`,          icon: '⭐' },
              { label: 'Messages',      value: userMsgs,                 icon: '💬' },
              { label: 'Help Requests', value: struggleCount,            icon: '🤝' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl p-5"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="text-3xl mb-1">{stat.icon}</div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-blue-300 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <button id="new-session-btn"
              onClick={() => { setPhase('setup'); setMessages([]); setElapsed(0); }}
              className="w-full py-4 rounded-2xl font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              🎙️ Start Another Session
            </button>
            <button id="back-to-games-btn" onClick={onClose}
              className="w-full py-3 rounded-xl text-sm"
              style={{ color: 'rgba(255,255,255,0.4)' }}>
              ← Back to games
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SESSION PHASE
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col"
      style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 60%, #24243e 100%)' }}>

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{currentTopic.icon}</span>
          <div>
            <p className="text-white font-bold text-sm">{currentTopic.label}</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Level {level} · {formatDuration(elapsed)}</p>
          </div>
        </div>

        {/* AI Status pill */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="w-2 h-2 rounded-full"
            style={{
              background: aiStatus === 'error' ? '#ef4444'
                : aiStatus === 'thinking' ? '#f59e0b'
                : aiStatus === 'speaking' ? '#10b981'
                : aiStatus === 'listening' ? '#3b82f6'
                : 'rgba(255,255,255,0.3)',
              boxShadow: aiStatus !== 'idle' ? `0 0 8px currentColor` : 'none',
              animation: aiStatus === 'thinking' || aiStatus === 'speaking' ? 'pulse 1s infinite' : 'none',
            }} />
          <span className="text-xs font-medium capitalize" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Lena is {aiStatus === 'idle' ? 'ready' : aiStatus}…
          </span>
        </div>

        <button id="end-session-btn" onClick={endSession}
          className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)' }}>
          End Session
        </button>
      </div>

      {/* ── Chat area ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4" style={{ maxHeight: 'calc(100vh - 220px)' }}>
        {messages.map((msg) => (
          <div key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm mr-2 flex-shrink-0 self-end"
                style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
                🤖
              </div>
            )}
            <div className="max-w-xs sm:max-w-md lg:max-w-lg rounded-2xl px-4 py-3"
              style={{
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, #2563eb, #7c3aed)'
                  : msg.language === 'mixed'
                    ? 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.1))'
                    : 'rgba(255,255,255,0.08)',
                border: msg.role === 'assistant' && msg.language === 'mixed'
                  ? '1px solid rgba(245,158,11,0.3)'
                  : '1px solid rgba(255,255,255,0.07)',
              }}>
              {msg.role === 'assistant' && msg.language === 'mixed' && (
                <div className="text-xs font-semibold mb-1" style={{ color: '#fbbf24' }}>
                  💡 English Help
                </div>
              )}
              <p className="text-white text-sm leading-relaxed">{msg.content}</p>
              {msg.hadStruggle && (
                <p className="text-xs mt-1 opacity-40">🤝 needed help</p>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm ml-2 flex-shrink-0 self-end"
                style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
                🧑
              </div>
            )}
          </div>
        ))}

        {/* Interim transcript preview */}
        {interimTranscript && (
          <div className="flex justify-end">
            <div className="max-w-xs rounded-2xl px-4 py-3 opacity-60"
              style={{ background: 'rgba(37,99,235,0.3)', border: '1px dashed rgba(99,179,237,0.4)' }}>
              <p className="text-white text-sm italic">{interimTranscript}…</p>
            </div>
          </div>
        )}

        {/* Thinking indicator */}
        {aiStatus === 'thinking' && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm mr-2"
              style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>🤖</div>
            <div className="rounded-2xl px-5 py-3" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="flex gap-1.5 items-center h-5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-blue-400"
                    style={{ animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="mx-auto max-w-sm rounded-2xl px-5 py-4 text-sm text-center"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
            {errorMsg}
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* ── Bottom mic area ──────────────────────────────────────────────── */}
      <div className="px-6 py-5 flex-shrink-0 flex flex-col items-center gap-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.3)' }}>

        {/* Instruction text */}
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {isMyTurn
            ? isListening
              ? 'Listening… speak in German. Tap mic to send.'
              : 'Getting microphone ready…'
            : aiStatus === 'speaking'
              ? 'Lena is speaking…'
              : aiStatus === 'thinking'
                ? 'Lena is thinking…'
                : 'Waiting…'}
        </p>

        {/* Mic button */}
        <button id="mic-btn"
          onClick={handleMicPress}
          disabled={!isMyTurn}
          className="relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200"
          style={{
            background: isMyTurn && isListening
              ? 'linear-gradient(135deg, #ef4444, #dc2626)'
              : isMyTurn
                ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                : 'rgba(255,255,255,0.08)',
            boxShadow: isMyTurn && isListening
              ? '0 0 0 0 rgba(239,68,68,0.4)'
              : 'none',
            animation: isMyTurn && isListening ? 'mic-pulse 1.5s infinite' : 'none',
            cursor: isMyTurn ? 'pointer' : 'not-allowed',
          }}
        >
          <span className="text-3xl">{isMyTurn && isListening ? '⏹' : '🎙️'}</span>
        </button>

        {/* Stats strip */}
        <div className="flex gap-6 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
          <span>💬 {messages.filter(m => m.role === 'user').length} messages</span>
          <span>🤝 {struggleCount} helped</span>
          <span>⭐ {Math.min(200, Math.round(elapsed / 10) * 5 + messages.filter(m => m.role === 'user').length * 3)} XP</span>
        </div>

        {/* Text input fallback */}
        {isMyTurn && (
          <div className="flex w-full max-w-lg gap-2">
            <input
              id="text-input-fallback"
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTextSend()}
              placeholder="Or type your answer here…"
              className="flex-1 px-4 py-2 rounded-xl text-sm text-white"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', outline: 'none' }}
            />
            <button onClick={handleTextSend} disabled={!textInput.trim()}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: textInput.trim() ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : 'rgba(255,255,255,0.08)' }}>
              Send
            </button>
          </div>
        )}
      </div>

      {/* ── Inline styles for animations ─────────────────────────────────── */}
      <style>{`
        @keyframes mic-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
          70%  { box-shadow: 0 0 0 18px rgba(239,68,68,0); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default VoiceTutor;
