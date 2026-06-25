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
  const challengeXP = (userData.dailyChallenges || [])
    .filter(c => c.date === todayStr && c.completed)
    .length * 50;
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
          background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(168,85,247,0.15))',
          border: '1px solid rgba(99,179,237,0.2)',
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
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #1e3a5f 100%)',
          borderRadius: 20,
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          border: '1px solid rgba(99,179,237,0.15)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
          position: 'relative',
          overflow: 'hidden',
        }}>
        {/* Background glow orbs */}
        <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.2), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -20, left: 60, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.15), transparent 70%)', pointerEvents: 'none' }} />

        {/* Mascot */}
        <div
          className={`animate-float ${mascotWiggle ? 'animate-wiggle' : ''}`}
          onClick={() => { setMascotWiggle(true); setTimeout(() => setMascotWiggle(false), 600); }}
          style={{ fontSize: 56, cursor: 'pointer', flexShrink: 0, userSelect: 'none', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' }}
          title="Click me!"
        >
          🦉
        </div>

        {/* Text */}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, color: 'rgba(167,139,250,0.9)', fontWeight: 700, marginBottom: 2 }}>
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
                  boxShadow: '0 0 12px rgba(168,85,247,0.5)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── 4 Animated Stat Cards ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}
        className="sm:grid-cols-4">
        {/* Streak */}
        <div className="stat-card animate-slide-up" style={{
          background: 'linear-gradient(135deg, #7c2d12, #ea580c)',
          animation: 'slide-up 0.5s 0.1s ease-out both',
        }}>
          <div style={{ fontSize: 22, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }}>🔥</div>
          <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, color: '#fed7aa' }}>
            <AnimatedNumber target={userData.stats.currentStreak} />
          </div>
          <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 700 }}>Day Streak</div>
          {userData.stats.currentStreak > 0 && (
            <div style={{
              position: 'absolute', top: 8, right: 8,
              animation: 'pulse-ring 2s infinite',
              width: 8, height: 8, borderRadius: '50%', background: '#fed7aa',
            }} />
          )}
        </div>

        {/* XP */}
        <div className="stat-card animate-slide-up" style={{
          background: 'linear-gradient(135deg, #713f12, #ca8a04)',
          animation: 'slide-up 0.5s 0.2s ease-out both',
        }}>
          <div style={{ fontSize: 22 }}>⚡</div>
          <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, color: '#fef08a' }}>
            <AnimatedNumber target={userData.stats.totalXP} />
          </div>
          <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 700 }}>Total XP</div>
        </div>

        {/* Words */}
        <div className="stat-card animate-slide-up" style={{
          background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
          animation: 'slide-up 0.5s 0.3s ease-out both',
        }}>
          <div style={{ fontSize: 22 }}>📚</div>
          <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, color: '#bfdbfe' }}>
            <AnimatedNumber target={userData.stats.wordsLearned} />
          </div>
          <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 700 }}>Words Learned</div>
        </div>

        {/* Accuracy */}
        <div className="stat-card animate-slide-up" style={{
          background: 'linear-gradient(135deg, #14532d, #16a34a)',
          animation: 'slide-up 0.5s 0.4s ease-out both',
        }}>
          <div style={{ fontSize: 22 }}>🎯</div>
          <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, color: '#bbf7d0' }}>
            <AnimatedNumber target={userData.stats.accuracy} suffix="%" />
          </div>
          <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 700 }}>Accuracy</div>
        </div>
      </div>

      {/* ── Daily Goal + Today's Challenge ────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

        {/* Daily Goal */}
        <div className="game-card" style={{
          background: 'linear-gradient(135deg, #1f2937, #111827)',
          border: `1px solid ${dailyColor}33`,
          padding: 14,
          boxShadow: `0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px ${dailyColor}22`,
        }}>
          <p style={{ fontSize: 11, fontWeight: 800, opacity: 0.6, marginBottom: 8 }}>📅 DAILY GOAL</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <CircleRing pct={dailyPct} size={56} stroke={6} color={dailyColor} />
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
        <div className="game-card" style={{
          background: 'linear-gradient(135deg, #3d2a00, #92400e)',
          border: '1px solid rgba(250,204,21,0.3)',
          padding: 14,
          boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(250,204,21,0.15)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#fcd34d' }}>⚡ CHALLENGE</span>
            <span style={{
              fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 999,
              background: 'rgba(250,204,21,0.2)', color: '#facc15', border: '1px solid rgba(250,204,21,0.35)',
            }}>+50 XP</span>
          </div>
          <p style={{ fontSize: 13, fontWeight: 800, marginBottom: 2 }}>
            🎯 Complete 3 Quiz rounds
          </p>
          <p style={{ fontSize: 11, opacity: 0.55, marginBottom: 8 }}>
            80%+ accuracy required
          </p>
          <button
            onClick={() => { window.location.hash = 'game-quiz'; }}
            style={{
              width: '100%', padding: '6px 0',
              background: 'linear-gradient(135deg, #ca8a04, #facc15)',
              color: '#1a0a00', fontWeight: 900, fontSize: 11,
              border: 'none', borderRadius: 8, cursor: 'pointer',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
          >
            Start Quiz →
          </button>
        </div>
      </div>

      {/* ── Tutor and Flashcard Side by Side ──────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* AI Voice Tutor Hero */}
        <div className="game-card animate-slide-up" style={{
          background: 'linear-gradient(135deg, #0a1628 0%, #1a0e3d 40%, #0d2818 100%)',
          border: '1px solid rgba(34,197,94,0.25)',
          padding: '20px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,197,94,0.1)',
          position: 'relative',
          overflow: 'hidden',
          height: '100%',
        }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.1), transparent 65%)', pointerEvents: 'none' }} />

          {/* Mic Icon */}
          <div style={{ flexShrink: 0, textAlign: 'center' }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28,
              animation: 'pulse-green 2.5s infinite',
              boxShadow: '0 4px 15px rgba(34,197,94,0.3)',
            }}>
              🎙️
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <h3 style={{ fontSize: 18, fontWeight: 900 }}>AI Voice Tutor</h3>
              <span style={{
                fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 999,
                background: 'rgba(34,197,94,0.2)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)',
              }}>LENA ✨</span>
            </div>
            <p style={{ fontSize: 12, opacity: 0.6, marginBottom: 12, lineHeight: 1.4 }}>
              Have a real German conversation with your AI tutor. Get instant help when you struggle.
            </p>
            <button
              className="glow-btn glow-btn-green"
              onClick={() => onStartTutor?.()}
              style={{ fontSize: 13, padding: '10px 20px', borderRadius: 12 }}
            >
              🎙️ Start Speaking Now
            </button>
          </div>
        </div>

        {/* Flashcard Mode Card */}
        <div className="game-card" style={{
          background: 'linear-gradient(135deg, #1e3a5f, #1e1b4b)',
          border: '1px solid rgba(99,179,237,0.2)',
          padding: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          height: '100%',
        }}>
          <div style={{ fontSize: 36, flexShrink: 0 }}>🃏</div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 2 }}>Flashcard Mode</h3>
            <p style={{ fontSize: 12, opacity: 0.55, marginBottom: 10 }}>
              Review vocabulary with interactive flashcards at your own pace
            </p>
            <button
              onClick={() => { window.location.hash = 'flashcard'; }}
              className="glow-btn glow-btn-purple"
              style={{ fontSize: 12, padding: '8px 16px', borderRadius: 10 }}
            >
              Start Flashcards →
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
