import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { UserData } from '../types';
import AchievementsPanel from './AchievementsPanel';
import Leaderboard from './Leaderboard';
import FlashcardMode from './FlashcardMode';
import GameMenu from './GameMenu';

interface DashboardProps {
  userData: UserData;
  user?: User | null;
  syncing?: boolean;
  onStartTutor?: () => void;
  onSelectGame?: (game: 'matching' | 'memory' | 'quiz' | 'typing' | 'pronunciation' | 'voice-tutor') => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const getLevelName = (level: number) => {
  if (level < 2)  return 'Beginner 🌱';
  if (level < 5)  return 'Explorer 🔭';
  if (level < 10) return 'Learner 📚';
  if (level < 15) return 'Speaker 🗣️';
  return 'Master 🏆';
};

const getNextLevelXP = (level: number) => (level + 1) * 100;

// Animated number counter
const AnimatedNumber: React.FC<{ target: number; suffix?: string; duration?: number }> = ({
  target, suffix = '', duration = 1000,
}) => {
  const [val, setVal] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(ease * target));
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return <>{val.toLocaleString()}{suffix}</>;
};

// Circular progress ring
const CircleRing: React.FC<{ pct: number; size?: number; stroke?: number; color?: string }> = ({
  pct, size = 80, stroke = 8, color = '#22c55e',
}) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
      />
    </svg>
  );
};

// ── Component ─────────────────────────────────────────────────────────────────

const Dashboard: React.FC<DashboardProps> = ({ userData, user, syncing, onStartTutor, onSelectGame }) => {
  const [showFlashcardMode, setShowFlashcardMode] = useState(false);
  const [mascotWiggle, setMascotWiggle] = useState(false);
  
  // Choose a random game for Today's Challenge on mount
  const [challengeGame] = useState(() => {
    const list = [
      { id: 'quiz', name: 'Quiz Game', label: 'Complete a Quiz round', target: 'game-quiz' },
      { id: 'matching', name: 'Matching Game', label: 'Complete a Matching round', target: 'game-matching' },
      { id: 'memory', name: 'Memory Game', label: 'Complete a Memory matching round', target: 'game-memory' },
      { id: 'typing', name: 'Typing Game', label: 'Complete a translation Typing round', target: 'game-typing' },
      { id: 'pronunciation', name: 'Pronunciation Game', label: 'Complete a Pronunciation round', target: 'game-pronunciation' },
    ];
    const randomIndex = Math.floor(Math.random() * list.length);
    return list[randomIndex];
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      setShowFlashcardMode(hash === 'flashcard');
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const currentLevelXP = userData.stats.level * 100;
  const nextLevelXP = getNextLevelXP(userData.stats.level);
  const xpProgress = Math.min(
    ((userData.stats.totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100,
    100
  );

  // Daily goal: 100 XP
  const todayStr = new Date().toDateString();
  const gameXP = (userData.gameSessions || [])
    .filter(session => session.timestamp && new Date(session.timestamp).toDateString() === todayStr)
    .reduce((sum, session) => sum + (session.xpEarned || 0), 0);
  
  // Check if today's selected challenge game is completed with >= 80% accuracy
  const isChallengeCompleted = (userData.gameSessions || []).some(session => {
    return session.gameType === challengeGame.id && 
           session.timestamp && 
           new Date(session.timestamp).toDateString() === todayStr &&
           session.accuracy >= 80;
  });

  const challengeXP = isChallengeCompleted ? 50 : 0;
  const todayXP = gameXP + challengeXP;

  const DAILY_GOAL_XP = 100;
  const dailyPct = Math.min((todayXP / DAILY_GOAL_XP) * 100, 100);
  const dailyColor = dailyPct < 33 ? '#ef4444' : dailyPct < 66 ? '#f97316' : '#22c55e';

  if (showFlashcardMode) {
    return <FlashcardMode onClose={() => { window.location.hash = ''; }} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── User welcome banner ──────────────────────────────────────────── */}
      {user ? (
        <div style={{
          background: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(99,179,237,0.1))',
          border: '1px solid var(--color-border)',
          borderRadius: 20,
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%', overflow: 'hidden',
              background: 'linear-gradient(135deg,#63b3ed,#7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 14, color: 'white', flexShrink: 0,
            }}>
              {user.photoURL
                ? <img src={user.photoURL} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (user.displayName ?? user.email ?? '?').slice(0, 2).toUpperCase()
              }
            </div>
            <div>
              <p style={{ fontWeight: 800, fontSize: 14 }}>
                Willkommen, {user.displayName?.split(' ')[0] ?? 'Learner'}! 👋
              </p>
              <p style={{ fontSize: 11, opacity: 0.45 }}>{user.email}</p>
            </div>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: syncing ? '#60a5fa' : '#4ade80',
          }}>
            {syncing ? '⟳ Syncing…' : '☁ Synced'}
          </span>
        </div>
      ) : (
        <div style={{
          background: 'rgba(251,191,36,0.07)',
          border: '1px solid rgba(251,191,36,0.18)',
          borderRadius: 20, padding: '10px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <p style={{ fontSize: 13, opacity: 0.7 }}>🔒 Guest mode — progress saved locally</p>
          <span style={{ fontSize: 11, opacity: 0.45 }}>Sign in to sync</span>
        </div>
      )}

      {/* ── Mascot + Hero ────────────────────────────────────────────────── */}
      <div
        className="animate-slide-up"
        style={{
          background: 'var(--color-surface)',
          borderRadius: 24,
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
          position: 'relative',
          overflow: 'hidden',
        }}>
        {/* Background glow orbs */}
        <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.15), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -20, left: 60, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.1), transparent 70%)', pointerEvents: 'none' }} />

        {/* Mascot */}
        <div
          className={`animate-float ${mascotWiggle ? 'animate-wiggle' : ''}`}
          onClick={() => { setMascotWiggle(true); setTimeout(() => setMascotWiggle(false), 600); }}
          style={{ fontSize: 56, cursor: 'pointer', flexShrink: 0, userSelect: 'none', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))' }}
          title="Click me!"
        >
          🦉
        </div>

        {/* Text */}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, color: 'var(--color-purple)', fontWeight: 700, marginBottom: 2 }}>
            Your daily German coach
          </p>
          <h2 style={{ fontSize: 20, fontWeight: 900, lineHeight: 1.2, marginBottom: 6 }}>
            Guten Tag! Ready to<br/>speak German today? 🇩🇪
          </h2>
          <p style={{ fontSize: 12, opacity: 0.55, marginBottom: 10 }}>
            Level {userData.stats.level} · {getLevelName(userData.stats.level)}
          </p>

          {/* XP Level Progress */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.6, marginBottom: 6 }}>
              <span>Level {userData.stats.level}</span>
              <span>{userData.stats.totalXP} / {nextLevelXP} XP</span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill-animated"
                style={{
                  width: `${xpProgress}%`,
                  background: 'linear-gradient(90deg, #818cf8, #a855f7)',
                  boxShadow: '0 0 12px rgba(168,85,247,0.3)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── 4 Premium Stat Cards ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}
        className="sm:grid-cols-4">
        {/* Streak */}
        <div className="stat-card bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400">
          <div style={{ fontSize: 22, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.15))' }}>🔥</div>
          <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, marginTop: 4 }}>
            <AnimatedNumber target={userData.stats.currentStreak} />
          </div>
          <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 700 }}>Day Streak</div>
          {userData.stats.currentStreak > 0 && (
            <div style={{
              position: 'absolute', top: 8, right: 8,
              animation: 'pulse-ring 2s infinite',
              width: 8, height: 8, borderRadius: '50%', background: '#f97316',
            }} />
          )}
        </div>

        {/* XP */}
        <div className="stat-card bg-yellow-500/5 dark:bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400">
          <div style={{ fontSize: 22 }}>⚡</div>
          <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, marginTop: 4 }}>
            <AnimatedNumber target={userData.stats.totalXP} />
          </div>
          <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 700 }}>Total XP</div>
        </div>

        {/* Words */}
        <div className="stat-card bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
          <div style={{ fontSize: 22 }}>📚</div>
          <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, marginTop: 4 }}>
            <AnimatedNumber target={userData.stats.wordsLearned} />
          </div>
          <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 700 }}>Words Learned</div>
        </div>

        {/* Accuracy */}
        <div className="stat-card bg-green-500/5 dark:bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400">
          <div style={{ fontSize: 22 }}>🎯</div>
          <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, marginTop: 4 }}>
            <AnimatedNumber target={userData.stats.accuracy} suffix="%" />
          </div>
          <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 700 }}>Accuracy</div>
        </div>
      </div>

      {/* ── Daily Goal + Today's Challenge ────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        {/* Daily Goal */}
        <div className="game-card p-5 border border-slate-200 dark:border-slate-800" style={{ background: 'var(--color-surface)' }}>
          <p style={{ fontSize: 11, fontWeight: 800, opacity: 0.6, marginBottom: 8 }}>📅 DAILY GOAL</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <CircleRing pct={dailyPct} size={58} stroke={6} color={dailyColor} />
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 900, color: dailyColor,
              }}>
                {Math.round(dailyPct)}%
              </div>
            </div>
            <div>
              <p style={{ fontSize: 18, fontWeight: 900, color: dailyColor }}>
                {todayXP}<span style={{ fontSize: 11, opacity: 0.6 }}>/{DAILY_GOAL_XP} XP</span>
              </p>
              <p style={{ fontSize: 11, opacity: 0.5, marginTop: 1 }}>
                {dailyPct >= 100 ? '🎉 Reached!' : `${DAILY_GOAL_XP - todayXP} XP to go`}
              </p>
            </div>
          </div>
        </div>

        {/* Today's Challenge */}
        <div className="game-card p-5 border border-amber-500/25 bg-amber-500/5 dark:bg-amber-500/10">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-streak)' }}>⚡ CHALLENGE</span>
            <span style={{
              fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 999,
              background: 'rgba(250,204,21,0.2)', color: 'var(--color-xp)', border: '1px solid rgba(250,204,21,0.35)',
            }}>+50 XP</span>
            {isChallengeCompleted && <span style={{ fontSize: 11, color: '#22c55e', marginLeft: 'auto', fontWeight: 'bold' }}>✓ Done</span>}
          </div>
          <p style={{ fontSize: 13, fontWeight: 800, marginBottom: 2 }}>
            🎯 {challengeGame.label}
          </p>
          <p style={{ fontSize: 11, opacity: 0.55, marginBottom: 8 }}>
            80%+ accuracy required
          </p>
          <button
            onClick={() => { window.location.hash = challengeGame.target; }}
            disabled={isChallengeCompleted}
            style={{
              width: '100%', padding: '6px 0',
              background: isChallengeCompleted ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #ca8a04, #facc15)',
              color: isChallengeCompleted ? 'rgba(255,255,255,0.3)' : '#1a0a00',
              fontWeight: 900, fontSize: 11,
              border: 'none', borderRadius: 8, cursor: isChallengeCompleted ? 'not-allowed' : 'pointer',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { if (!isChallengeCompleted) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { if (!isChallengeCompleted) (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
          >
            {isChallengeCompleted ? 'Completed! 🎉' : `Start ${challengeGame.name} →`}
          </button>
        </div>
      </div>

      {/* ── Tutor and Flashcard Side by Side ──────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* AI Voice Tutor Hero */}
        <div className="game-card p-5 border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 relative overflow-hidden flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center text-3xl shadow-md flex-shrink-0 animate-float">
            🎙️
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-black text-sm">AI Voice Tutor</h3>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">LENA ✨</span>
            </div>
            <p className="text-xs opacity-60 mb-3">Speak German with your AI tutor.</p>
            <button
              onClick={() => onStartTutor?.()}
              className="glow-btn glow-btn-green py-2 px-4 rounded-xl text-xs font-extrabold"
            >
              Start Speaking
            </button>
          </div>
        </div>

        {/* Flashcard Mode Card */}
        <div className="game-card p-5 border border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-500/10 relative overflow-hidden flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-400 to-purple-500 flex items-center justify-center text-3xl shadow-md flex-shrink-0">
            🃏
          </div>
          <div className="flex-1">
            <h3 className="font-black text-sm mb-1">Flashcard Mode</h3>
            <p className="text-xs opacity-60 mb-3">Review vocabulary at your own pace.</p>
            <button
              onClick={() => { window.location.hash = 'flashcard'; }}
              className="glow-btn glow-btn-purple py-2 px-4 rounded-xl text-xs font-extrabold"
            >
              Start Cards
            </button>
          </div>
        </div>
      </div>

      {/* ── Choose Your Game ──────────────────────────────────────────────── */}
      {onSelectGame && <GameMenu onSelectGame={onSelectGame} />}

      {/* ── Detailed sections ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Leaderboard userData={userData} currentUid={user?.uid} />
        <AchievementsPanel userData={userData} />
      </div>
    </div>
  );
};

export default Dashboard;
