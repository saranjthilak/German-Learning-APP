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
  { id: 'daily-conversation', label: 'Daily Chat',      icon: '💬', color: '#8b5cf6' },
  { id: 'restaurant',         label: 'Restaurant',      icon: '🍽️', color: '#f59e0b' },
  { id: 'shopping',           label: 'Shopping',        icon: '🛍️', color: '#ec4899' },
  { id: 'airport',            label: 'Airport',         icon: '✈️', color: '#3b82f6' },
  { id: 'hotel',              label: 'Hotel',           icon: '🏨', color: '#a855f7' },
  { id: 'job-interview',      label: 'Job Interview',   icon: '💼', color: '#10b981' },
  { id: 'doctor-visit',       label: 'Doctor Visit',    icon: '🏥', color: '#ef4444' },
  { id: 'office-meeting',     label: 'Office Meeting',  icon: '🖥️', color: '#06b6d4' },
  { id: 'travel',             label: 'Travel',          icon: '🗺️', color: '#f97316' },
  { id: 'friends-and-family', label: 'Friends & Family',icon: '👨‍👩‍👧', color: '#84cc16' },
];

const LEVELS: { id: ProficiencyLevel; label: string; desc: string }[] = [
  { id: 'A1', label: 'A1', desc: 'Beginner' },
  { id: 'A2', label: 'A2', desc: 'Elementary' },
  { id: 'B1', label: 'B1', desc: 'Intermediate' },
  { id: 'B2', label: 'B2', desc: 'Upper-Int' },
  { id: 'C1', label: 'C1', desc: 'Advanced' },
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

// Split messages into German and English hint parts
const getMessageParts = (content: string) => {
  const sentences = content.split(/(?<=[.!?])\s+/);
  const germanParts: string[] = [];
  const englishParts: string[] = [];
  
  sentences.forEach(s => {
    const lower = s.toLowerCase();
    const isEnglish = ['the', 'is', 'and', 'to', 'in', 'you', 'it', 'means', 'translation', 'for', 'word', 'say', 'helper', 'struggle', 'help', 'pronunciation'].some(w => lower.includes(w));
    if (isEnglish) {
      englishParts.push(s);
    } else {
      germanParts.push(s);
    }
  });

  return {
    german: germanParts.join(' ').trim() || content,
    english: englishParts.join(' ').trim()
  };
};

// ── Tutor Avatar Component ────────────────────────────────────────────────────
interface TutorAvatarProps {
  status: AIStatus;
  emotion?: string;
}

const TutorAvatar: React.FC<TutorAvatarProps> = ({ status, emotion = '' }) => {
  let statusEmoji = '🦉';
  let animationClass = 'animate-float';
  let pulseRing = false;
  let ringColor = 'rgba(168, 85, 247, 0.4)';

  if (status === 'listening') {
    statusEmoji = '👂';
    animationClass = 'animate-pulse';
    pulseRing = true;
    ringColor = 'rgba(59, 130, 246, 0.6)';
  } else if (status === 'speaking') {
    // Map Lena's German action words to expressive avatar emojis
    if (emotion.includes('lächelt')) {
      statusEmoji = '😊';
    } else if (emotion.includes('lacht')) {
      statusEmoji = '😆';
    } else if (emotion.includes('nickt')) {
      statusEmoji = '😌';
    } else if (emotion.includes('überlegt')) {
      statusEmoji = '🤔';
    } else if (emotion.includes('staunt')) {
      statusEmoji = '🤩';
    } else if (emotion.includes('mitfühlend')) {
      statusEmoji = '🥺';
    } else if (emotion.includes('zwinkert')) {
      statusEmoji = '😉';
    } else {
      statusEmoji = '🗣️';
    }
    animationClass = 'animate-wiggle';
    pulseRing = true;
    ringColor = 'rgba(16, 185, 129, 0.6)';
  } else if (status === 'thinking') {
    statusEmoji = '💭';
    animationClass = 'animate-bounce';
  } else if (status === 'error') {
    statusEmoji = '❌';
    animationClass = '';
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className="relative">
        {pulseRing && (
          <div 
            className="absolute -inset-3 rounded-full animate-ping opacity-75"
            style={{ backgroundColor: ringColor }}
          />
        )}
        <div 
          className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl shadow-lg border-2 border-white/20 transition-all duration-300 ${animationClass}`}
          style={{
            background: 'linear-gradient(135deg, #a855f7, #6366f1)',
            boxShadow: '0 8px 32px rgba(139, 92, 246, 0.3)',
          }}
        >
          {statusEmoji}
        </div>
      </div>
      <div className="text-center">
        <h4 className="text-sm font-black text-white">Lena</h4>
        <span className="text-[10px] uppercase font-bold tracking-widest text-purple-300">
          {status === 'idle' && 'Ready'}
          {status === 'listening' && 'Listening...'}
          {status === 'speaking' && 'Speaking...'}
          {status === 'thinking' && 'Thinking...'}
          {status === 'error' && 'Error'}
        </span>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────

const VoiceTutor: React.FC<VoiceTutorProps> = ({ onClose }) => {
  const { user } = useAuth();
  const userData = StorageManager.getUserData();

  // ── Setup state ──────────────────────────────────────────────────────────
  const [phase, setPhase]       = useState<TutorPhase>('setup');
  const [topic, setTopic]       = useState<ConversationTopic>('daily-conversation');
  const [level, setLevel]       = useState<ProficiencyLevel>('A1');
  const [apiKey]                = useState<string>(getStoredApiKey());
  
  // English hints visibility toggle state
  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({});

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

  // ── Silence detection — auto-send after 2s of silence
  useEffect(() => {
    if (!isListening || !isMyTurn) return;
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    silenceTimer.current = setTimeout(() => {
      if (!isMyTurnRef.current) return;
      const current = latestTranscript.current.trim();
      if (current) {
        handleUserSubmit(current);
      }
    }, 2000);
    return () => { if (silenceTimer.current) clearTimeout(silenceTimer.current); };
  }, [transcript, isListening, isMyTurn]);

  // ── startUserTurn ────────────────────────────────────────────────────────
  const startUserTurn = useCallback(() => {
    setAiStatus('listening');
    setIsMyTurn(true);
    isMyTurnRef.current = true;
    resetTranscript();
    latestTranscript.current = '';
    // Give the browser 350ms to finish releasing the TTS audio output
    // before switching audio hardware to microphone input mode
    setTimeout(() => {
      if (isMyTurnRef.current) {
        startListening();
      }
    }, 350);
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

      setAiStatus('speaking');
      speak(
        response.text,
        response.hasEnglishHelp ? 'en-US' : 'de-DE',
        startUserTurn
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
        setErrorMsg(`Blocked by Gemini safety filters: ${msg.split(': ')[1] || 'Unknown reason'}`);
      } else {
        setErrorMsg(`AI error: ${msg}`);
      }
      setAiStatus('error');
      setIsMyTurn(true);
      isMyTurnRef.current = true;
    }
  }, [level, topic, userData.playerName, speak, startUserTurn]);

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
    setRevealedHints({});

    const starter = getTopicStarter(topic);
    const starterMsg: TutorMessage = {
      id: 'intro', role: 'assistant', content: starter,
      language: 'german', timestamp: new Date().toISOString(),
    };
    const initialHistory: ChatMessage[] = [{ role: 'model' as const, content: starter }];
    setMessages([starterMsg]);
    setChatHistory(initialHistory);
    chatHistoryRef.current = initialHistory;

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

  const currentTopic = TOPICS.find((t) => t.id === topic)!;

  // Toggle english hint visibility per message
  const toggleHint = (msgId: string) => {
    setRevealedHints(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SETUP PHASE
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="flex flex-col animate-slide-up"
        style={{
          position: 'fixed',
          top: 60,
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: 'linear-gradient(135deg, var(--color-bg) 0%, var(--color-surface) 100%)',
          overflowY: 'auto',
        }}>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl py-2">
            {/* Header */}
            <div className="text-center mb-4">
              <div className="text-4xl mb-1">🎙️</div>
              <h1 className="text-2xl font-black text-white mb-0.5">AI Voice Tutor</h1>
              <p className="text-purple-300 text-sm">Speak German with your personal tutor, Lena</p>
            </div>

            {/* API key warning */}
            {!apiKey && (
              <div className="mb-3 rounded-xl px-4 py-2.5 text-[11px] text-center"
                style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)', color: '#fbbf24' }}>
                ⚠️ No Gemini API key found. Go to <strong>Settings ⚙️</strong> and add your key before starting.
              </div>
            )}

            {/* Browser support warning */}
            {!isSupported && (
              <div className="mb-3 rounded-xl px-4 py-2.5 text-[11px] text-center"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                ⚠️ Your browser doesn't support voice input. Please use <strong>Chrome</strong> or <strong>Edge</strong>.
              </div>
            )}

            <div className="space-y-3">
              {/* Topic selector */}
              <div className="rounded-2xl p-4 glass-card border border-white/5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <h3 className="text-white font-black mb-2.5 text-xs tracking-wider uppercase opacity-80">Choose a Topic</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 max-h-[280px] overflow-y-auto pr-1">
                  {TOPICS.map((t) => (
                    <button key={t.id} id={`topic-${t.id}`}
                      onClick={() => setTopic(t.id)}
                      className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl text-[10px] font-bold transition-all duration-150 tactile-btn"
                      style={{
                        background: topic === t.id ? `${t.color}33` : 'rgba(255,255,255,0.03)',
                        border: topic === t.id ? `2px solid ${t.color}` : '2px solid transparent',
                        color: topic === t.id ? 'white' : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      <span className="text-xl">{t.icon}</span>
                      <span className="truncate w-full text-center">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Level selector */}
              <div className="rounded-2xl p-4 glass-card border border-white/5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <h3 className="text-white font-black mb-2.5 text-xs tracking-wider uppercase opacity-80">Your Level</h3>
                <div className="grid grid-cols-5 gap-2">
                  {LEVELS.map((l) => (
                    <button key={l.id} id={`level-${l.id}`}
                      onClick={() => setLevel(l.id)}
                      className="flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all duration-150 tactile-btn"
                      style={{
                        background: level === l.id ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.03)',
                        border: level === l.id ? '2px solid #a855f7' : '2px solid transparent',
                        color: level === l.id ? 'white' : 'rgba(255,255,255,0.45)',
                      }}
                    >
                      <span className="text-xs font-black">{l.label}</span>
                      <span className="text-[9px] text-center leading-tight opacity-70">{l.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Start button */}
              <button id="start-session-btn"
                onClick={startSession}
                disabled={!apiKey || !isSupported}
                className="w-full py-3 rounded-xl text-sm font-black text-white transition-all duration-200 tactile-btn"
                style={{
                  background: (!apiKey || !isSupported)
                    ? 'rgba(255,255,255,0.05)'
                    : 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                  boxShadow: (!apiKey || !isSupported) ? 'none' : '0 8px 24px rgba(139, 92, 246, 0.25)',
                  cursor: (!apiKey || !isSupported) ? 'not-allowed' : 'pointer',
                }}
              >
                {currentTopic.icon} Start Conversation
              </button>

              <button onClick={onClose} className="w-full py-1 text-xs opacity-50 hover:opacity-100 transition-opacity">
                ← Back to games
              </button>
            </div>
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
      <div className="flex flex-col"
        style={{
          position: 'fixed',
          top: 60,
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: 'linear-gradient(135deg, var(--color-bg) 0%, var(--color-surface) 100%)',
          overflowY: 'auto',
        }}>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md text-center py-4">
            <div className="text-4xl mb-2">🎉</div>
            <h2 className="text-xl font-black text-white mb-1">Great Session!</h2>
            <p className="text-purple-300 text-xs mb-5">Du hast fantastisch gesprochen!</p>

            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { label: 'Speaking Time', value: formatDuration(elapsed), icon: '⏱' },
                { label: 'XP Earned',     value: `+${xpEarned}`,          icon: '⭐' },
                { label: 'Messages',      value: userMsgs,                 icon: '💬' },
                { label: 'Help Requests', value: struggleCount,            icon: '🤝' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl p-3 glass-card border border-white/5"
                  style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="text-xl mb-1">{stat.icon}</div>
                  <div className="text-base font-black text-white">{stat.value}</div>
                  <div className="text-[10px] text-purple-300 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <button id="new-session-btn"
                onClick={() => { setPhase('setup'); setMessages([]); setElapsed(0); }}
                className="w-full py-3 rounded-xl font-black text-white text-xs tactile-btn"
                style={{ background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)' }}>
                🎙️ Start Another Session
              </button>
              <button id="back-to-games-btn" onClick={onClose}
                className="w-full py-1 text-xs opacity-50 hover:opacity-100 transition-opacity">
                ← Back to games
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SESSION PHASE
  // ─────────────────────────────────────────────────────────────────────────
  const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
  const currentEmotion = lastAssistantMsg ? (lastAssistantMsg.content.match(/^\*([^*]+)\*/)?.[1] || '') : '';

  return (
    <div className="flex flex-col animate-slide-up"
      style={{
        position: 'fixed',
        top: 60,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: 'linear-gradient(135deg, var(--color-bg) 0%, var(--color-surface) 100%)',
        height: 'calc(100vh - 60px)',
        overflow: 'hidden'
      }}>

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{currentTopic.icon}</span>
            <div>
              <p className="text-white font-black text-xs">{currentTopic.label}</p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Level {level} · {formatDuration(elapsed)}</p>
            </div>
          </div>

          <button id="end-session-btn" onClick={endSession}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold tactile-btn"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)' }}>
            End Session
          </button>
        </div>
      </div>

      {/* ── Tutor Avatar Status Strip (New Redesigned Element) ──────────── */}
      <div className="flex-shrink-0 py-3 border-b border-white/5 bg-white/[0.02] flex justify-center items-center">
        <TutorAvatar status={aiStatus} emotion={currentEmotion} />
      </div>

      {/* ── Chat area ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-4xl mx-auto w-full space-y-4">
          {messages.map((msg) => {
            const parts = getMessageParts(msg.content);
            const hasHint = parts.english.length > 0;
            const isRevealed = revealedHints[msg.id];

            return (
              <div key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs mr-2 flex-shrink-0 self-end"
                    style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)' }}>
                    🦉
                  </div>
                )}
                <div className="max-w-[80%] sm:max-w-md lg:max-w-lg rounded-2xl px-4 py-2.5 text-sm"
                  style={{
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #2563eb, #7c3aed)'
                      : 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}>
                
                {/* Assistant Message Rendering */}
                {msg.role === 'assistant' ? (
                  <div>
                    {/* Render German text */}
                    <p className="text-white text-xs leading-relaxed">{parts.german}</p>
                    
                    {/* English Hint Segment (revealed only when requested) */}
                    {hasHint && (
                      <div className="mt-2 pt-2 border-t border-white/10">
                        {isRevealed ? (
                          <div className="animate-slide-up">
                            <span className="text-[10px] font-bold text-yellow-400 block mb-0.5">💡 Hint translation:</span>
                            <p className="text-xs text-yellow-200/90 leading-relaxed italic">{parts.english}</p>
                          </div>
                        ) : null}
                        <button
                          onClick={() => toggleHint(msg.id)}
                          className="mt-1 text-[11px] font-bold text-yellow-400 hover:text-yellow-300 transition-colors flex items-center gap-1"
                        >
                          {isRevealed ? '🙈 Hide English Hint' : '💡 Show English Hint'}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* User Message Rendering */
                  <p className="text-white text-sm leading-relaxed">{msg.content}</p>
                )}

                {msg.hadStruggle && (
                  <p className="text-[9px] mt-0.5 opacity-40">🤝 needed help</p>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs ml-2 flex-shrink-0 self-end"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
                  🧑
                </div>
              )}
            </div>
          );
        })}

        {/* Interim transcript preview */}
        {interimTranscript && (
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl px-4 py-2.5 opacity-60"
              style={{ background: 'rgba(37,99,235,0.3)', border: '1px dashed rgba(99,179,237,0.4)' }}>
              <p className="text-white text-sm italic">{interimTranscript}…</p>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="mx-auto max-w-sm rounded-xl px-4 py-3 text-xs text-center"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
            {errorMsg}
          </div>
        )}

        </div>
        <div ref={chatBottomRef} />
      </div>

      {/* ── Bottom mic area ──────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-white/10 bg-black/10">
        <div className="px-4 py-4 flex flex-col items-center gap-2 max-w-4xl mx-auto w-full">

          {/* Instruction text */}
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {isMyTurn
              ? isListening
                ? 'Listening… speak German. Tap mic to send.'
                : 'Microphone activating…'
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
            className="relative w-15 h-15 rounded-full flex items-center justify-center transition-all duration-200 tactile-btn"
            style={{
              background: isMyTurn && isListening
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : isMyTurn
                  ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                  : 'rgba(255,255,255,0.08)',
              boxShadow: isMyTurn && isListening
                ? '0 0 0 0 rgba(239, 68, 68, 0.4)'
                : 'none',
              animation: isMyTurn && isListening ? 'mic-pulse 1.5s infinite' : 'none',
              cursor: isMyTurn ? 'pointer' : 'not-allowed',
            }}
          >
            <span className="text-2xl">{isMyTurn && isListening ? '⏹' : '🎙️'}</span>
          </button>

          {/* Stats strip */}
          <div className="flex gap-4 text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
            <span>💬 {messages.filter(m => m.role === 'user').length} messages</span>
            <span>🤝 {struggleCount} helped</span>
            <span>⭐ {Math.min(200, Math.round(elapsed / 10) * 5 + messages.filter(m => m.role === 'user').length * 3)} XP</span>
          </div>

          {/* Text input fallback */}
          {isMyTurn && (
            <div className="flex w-full max-w-2xl gap-2 mt-1">
              <input
                id="text-input-fallback"
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTextSend()}
                placeholder="Or type here..."
                className="flex-1 px-3.5 py-2 rounded-xl text-xs text-white"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}
              />
              <button onClick={handleTextSend} disabled={!textInput.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white tactile-btn"
                style={{ background: textInput.trim() ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : 'rgba(255,255,255,0.05)' }}>
                Send
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Inline styles for animations ─────────────────────────────────── */}
      <style>{`
        @keyframes mic-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
          70%  { box-shadow: 0 0 0 14px rgba(239,68,68,0); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }
      `}</style>
    </div>
  );
};

export default VoiceTutor;
