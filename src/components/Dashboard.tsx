import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { UserData } from '../types';
import { StorageManager } from '../utils/storage';
import { germanVocabulary } from '../data/vocabulary';
import AchievementsPanel from './AchievementsPanel';
import Leaderboard from './Leaderboard';
import DailyChallenge from './DailyChallenge';
import FlashcardMode from './FlashcardMode';
import GameMenu from './GameMenu';

interface DashboardProps {
  userData: UserData;
  user?: User | null;
  syncing?: boolean;
  onStartTutor?: () => void;
  onSelectGame?: (game: 'matching' | 'memory' | 'quiz' | 'typing' | 'pronunciation' | 'voice-tutor') => void;
  onSaveUserData: (updated: UserData) => void;
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

const Dashboard: React.FC<DashboardProps> = ({ userData, user, syncing, onStartTutor, onSelectGame, onSaveUserData }) => {
  const [showFlashcardMode, setShowFlashcardMode] = useState(false);
  const [mascotWiggle, setMascotWiggle] = useState(false);
  const TOTAL_WORDS = germanVocabulary.length;

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      setShowFlashcardMode(hash === 'flashcard');
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const weakWordsStats = StorageManager.getWeakWordsStats();
  const currentLevelXP = userData.stats.level * 100;
  const nextLevelXP = getNextLevelXP(userData.stats.level);
  const xpProgress = Math.min(
    ((userData.stats.totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100,
    100
  );

  // Daily goal: 100 XP or 5 games per day
  const DAILY_GOAL_XP = 100;
  const todayXP = Math.min(userData.stats.totalXP % DAILY_GOAL_XP || DAILY_GOAL_XP, DAILY_GOAL_XP);
  const dailyPct = (todayXP / DAILY_GOAL_XP) * 100;
  const dailyColor = dailyPct < 33 ? '#ef4444' : dailyPct < 66 ? '#f97316' : '#22c55e';

  const unlockedCount = userData.achievements.filter(a => a.unlocked).length;

  // Hardcoded achievement badges (may extend from userData.achievements)
  const badges = [
    { id: 'streak', icon: '🔥', label: 'Streak Master', desc: '7-day streak', unlocked: userData.stats.currentStreak >= 7, color: '#f97316' },
    { id: 'vocab',  icon: '📖', label: 'Vocab Hero',    desc: '50 words learned', unlocked: userData.stats.wordsLearned >= 50, color: '#3b82f6' },
    { id: 'acc',    icon: '🎯', label: 'Ace Accuracy',  desc: '90%+ accuracy', unlocked: userData.stats.accuracy >= 90, color: '#22c55e' },
    { id: 'games',  icon: '🎮', label: 'Game Addict',   desc: '20 games played', unlocked: userData.stats.gamesCompleted >= 20, color: '#a855f7' },
    { id: 'master', icon: '🏆', label: 'Level Master',  desc: 'Reach level 10', unlocked: userData.stats.level >= 10, color: '#facc15' },
    { id: 'tutor',  icon: '🤖', label: 'AI Talker',     desc: 'Use Voice Tutor', unlocked: userData.stats.gamesCompleted >= 1, color: '#ec4899' },
  ];

  if (showFlashcardMode) {
    return <FlashcardMode onClose={() => { window.location.hash = ''; }} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── User welcome banner ──────────────────────────────────────────── */}
      {user ? (
        <div style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(168,85,247,0.15))',
          border: '1px solid rgba(99,179,237,0.2)',
          borderRadius: 20,
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', overflow: 'hidden',
              background: 'linear-gradient(135deg,#63b3ed,#7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 16, color: 'white', flexShrink: 0,
            }}>
              {user.photoURL
                ? <img src={user.photoURL} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (user.displayName ?? user.email ?? '?').slice(0, 2).toUpperCase()
              }
            </div>
            <div>
              <p style={{ fontWeight: 800, fontSize: 15 }}>
                Willkommen, {user.displayName?.split(' ')[0] ?? 'Learner'}! 👋
              </p>
              <p style={{ fontSize: 12, opacity: 0.45 }}>{user.email}</p>
            </div>
          </div>
          <span style={{
            fontSize: 12, fontWeight: 700,
            color: syncing ? '#60a5fa' : '#4ade80',
          }}>
            {syncing ? '⟳ Syncing…' : '☁ Synced'}
          </span>
        </div>
      ) : (
        <div style={{
          background: 'rgba(251,191,36,0.07)',
          border: '1px solid rgba(251,191,36,0.18)',
          borderRadius: 20, padding: '12px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <p style={{ fontSize: 14, opacity: 0.7 }}>🔒 Guest mode — progress saved locally</p>
          <span style={{ fontSize: 12, opacity: 0.45 }}>Sign in to sync</span>
        </div>
      )}

      {/* ── Mascot + Hero ────────────────────────────────────────────────── */}
      <div
        className="animate-slide-up"
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #1e3a5f 100%)',
          borderRadius: 24,
          padding: '28px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 20,
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
          style={{ fontSize: 72, cursor: 'pointer', flexShrink: 0, userSelect: 'none', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' }}
          title="Click me!"
        >
          🦉
        </div>

        {/* Text */}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, color: 'rgba(167,139,250,0.9)', fontWeight: 700, marginBottom: 4 }}>
            Your daily German coach
          </p>
          <h2 style={{ fontSize: 24, fontWeight: 900, lineHeight: 1.2, marginBottom: 8 }}>
            Guten Tag! Ready to<br/>speak German today? 🇩🇪
          </h2>
          <p style={{ fontSize: 13, opacity: 0.55, marginBottom: 16 }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}
        className="sm:grid-cols-4">
        {/* Streak */}
        <div className="stat-card animate-slide-up" style={{
          background: 'linear-gradient(135deg, #7c2d12, #ea580c)',
          animation: 'slide-up 0.5s 0.1s ease-out both',
        }}>
          <div style={{ fontSize: 28, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }}>🔥</div>
          <div style={{ fontSize: 36, fontWeight: 900, lineHeight: 1, color: '#fed7aa' }}>
            <AnimatedNumber target={userData.stats.currentStreak} />
          </div>
          <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 700 }}>Day Streak</div>
          {userData.stats.currentStreak > 0 && (
            <div style={{
              position: 'absolute', top: 12, right: 12,
              animation: 'pulse-ring 2s infinite',
              width: 10, height: 10, borderRadius: '50%', background: '#fed7aa',
            }} />
          )}
        </div>

        {/* XP */}
        <div className="stat-card animate-slide-up" style={{
          background: 'linear-gradient(135deg, #713f12, #ca8a04)',
          animation: 'slide-up 0.5s 0.2s ease-out both',
        }}>
          <div style={{ fontSize: 28 }}>⚡</div>
          <div style={{ fontSize: 36, fontWeight: 900, lineHeight: 1, color: '#fef08a' }}>
            <AnimatedNumber target={userData.stats.totalXP} />
          </div>
          <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 700 }}>Total XP</div>
        </div>

        {/* Words */}
        <div className="stat-card animate-slide-up" style={{
          background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
          animation: 'slide-up 0.5s 0.3s ease-out both',
        }}>
          <div style={{ fontSize: 28 }}>📚</div>
          <div style={{ fontSize: 36, fontWeight: 900, lineHeight: 1, color: '#bfdbfe' }}>
            <AnimatedNumber target={userData.stats.wordsLearned} />
          </div>
          <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 700 }}>Words Learned</div>
        </div>

        {/* Accuracy */}
        <div className="stat-card animate-slide-up" style={{
          background: 'linear-gradient(135deg, #14532d, #16a34a)',
          animation: 'slide-up 0.5s 0.4s ease-out both',
        }}>
          <div style={{ fontSize: 28 }}>🎯</div>
          <div style={{ fontSize: 36, fontWeight: 900, lineHeight: 1, color: '#bbf7d0' }}>
            <AnimatedNumber target={userData.stats.accuracy} suffix="%" />
          </div>
          <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 700 }}>Accuracy</div>
        </div>
      </div>

      {/* ── Daily Goal + Today's Challenge ────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* Daily Goal */}
        <div className="game-card" style={{
          background: 'linear-gradient(135deg, #1f2937, #111827)',
          border: `1px solid ${dailyColor}33`,
          padding: 20,
          boxShadow: `0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px ${dailyColor}22`,
        }}>
          <p style={{ fontSize: 13, fontWeight: 800, opacity: 0.6, marginBottom: 12 }}>📅 DAILY GOAL</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <CircleRing pct={dailyPct} size={72} stroke={7} color={dailyColor} />
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 900, color: dailyColor,
              }}>
                {Math.round(dailyPct)}%
              </div>
            </div>
            <div>
              <p style={{ fontSize: 22, fontWeight: 900, color: dailyColor }}>
                {todayXP}<span style={{ fontSize: 13, opacity: 0.6 }}>/{DAILY_GOAL_XP} XP</span>
              </p>
              <p style={{ fontSize: 12, opacity: 0.5, marginTop: 3 }}>
                {dailyPct >= 100 ? '🎉 Goal reached!' : `${DAILY_GOAL_XP - todayXP} XP to go`}
              </p>
            </div>
          </div>
        </div>

        {/* Today's Challenge */}
        <div className="game-card" style={{
          background: 'linear-gradient(135deg, #3d2a00, #92400e)',
          border: '1px solid rgba(250,204,21,0.3)',
          padding: 20,
          boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(250,204,21,0.15)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#fcd34d' }}>⚡ TODAY'S CHALLENGE</span>
            <span style={{
              fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 999,
              background: 'rgba(250,204,21,0.2)', color: '#facc15', border: '1px solid rgba(250,204,21,0.35)',
            }}>+50 XP</span>
          </div>
          <p style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>
            🎯 Complete 3 Quiz rounds
          </p>
          <p style={{ fontSize: 12, opacity: 0.55, marginBottom: 12 }}>
            Score 80%+ accuracy to unlock the bonus
          </p>
          <button
            onClick={() => { window.location.hash = 'game-quiz'; }}
            style={{
              width: '100%', padding: '9px 0',
              background: 'linear-gradient(135deg, #ca8a04, #facc15)',
              color: '#1a0a00', fontWeight: 900, fontSize: 13,
              border: 'none', borderRadius: 12, cursor: 'pointer',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
          >
            Accept Challenge →
          </button>
        </div>
      </div>

      {/* ── AI Voice Tutor Hero ──────────────────────────────────────────── */}
      <div className="game-card animate-slide-up" style={{
        background: 'linear-gradient(135deg, #0a1628 0%, #1a0e3d 40%, #0d2818 100%)',
        border: '1px solid rgba(34,197,94,0.25)',
        padding: '32px 28px',
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,197,94,0.1)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.12), transparent 65%)', pointerEvents: 'none' }} />

        {/* Mic Icon */}
        <div style={{ flexShrink: 0, textAlign: 'center' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 38,
            animation: 'pulse-green 2.5s infinite',
            boxShadow: '0 4px 20px rgba(34,197,94,0.4)',
          }}>
            🎙️
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <h3 style={{ fontSize: 22, fontWeight: 900 }}>AI Voice Tutor</h3>
            <span style={{
              fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 999,
              background: 'rgba(34,197,94,0.2)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)',
            }}>LENA ✨</span>
          </div>
          <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 16, lineHeight: 1.5 }}>
            Have a real German conversation with your AI tutor. Get instant help when you struggle.
          </p>
          <button
            className="glow-btn glow-btn-green"
            onClick={() => onStartTutor?.()}
            style={{ fontSize: 15, padding: '14px 28px' }}
          >
            🎙️ Start Speaking Now
          </button>
        </div>
      </div>

      {/* ── Flashcard Mode Card ───────────────────────────────────────────── */}
      <div className="game-card" style={{
        background: 'linear-gradient(135deg, #1e3a5f, #1e1b4b)',
        border: '1px solid rgba(99,179,237,0.2)',
        padding: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 20,
      }}>
        <div style={{ fontSize: 52, flexShrink: 0 }}>🃏</div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 4 }}>Flashcard Mode</h3>
          <p style={{ fontSize: 13, opacity: 0.55, marginBottom: 14 }}>
            Review vocabulary with interactive flashcards at your own pace
          </p>
          <button
            onClick={() => { window.location.hash = 'flashcard'; }}
            className="glow-btn glow-btn-purple"
            style={{ fontSize: 13, padding: '11px 22px' }}
          >
            Start Flashcards →
          </button>
        </div>
      </div>

      {/* ── Choose Your Game ──────────────────────────────────────────────── */}
      {onSelectGame && <GameMenu onSelectGame={onSelectGame} />}

      {/* ── Achievement Badges ───────────────────────────────────────────── */}
      <div className="game-card" style={{
        background: '#1a1a2e',
        border: '1px solid rgba(255,255,255,0.06)',
        padding: '20px 20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontWeight: 900, fontSize: 17 }}>🏅 Achievement Badges</h3>
          <span style={{ fontSize: 12, opacity: 0.45 }}>
            {unlockedCount}/{userData.achievements.length} unlocked
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
          {badges.map((b, i) => (
            <div
              key={b.id}
              title={b.desc}
              className="animate-bounce-in"
              style={{
                flexShrink: 0,
                width: 84,
                background: b.unlocked ? `${b.color}18` : 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${b.unlocked ? `${b.color}44` : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 16,
                padding: '12px 8px',
                textAlign: 'center',
                filter: b.unlocked ? 'none' : 'grayscale(1)',
                opacity: b.unlocked ? 1 : 0.35,
                cursor: 'default',
                transition: 'transform 0.2s, box-shadow 0.2s',
                animationDelay: `${i * 0.07}s`,
              }}
              onMouseEnter={e => {
                if (b.unlocked) {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px) scale(1.05)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 20px ${b.color}44`;
                }
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.transform = '';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '';
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 6 }}>{b.icon}</div>
              <div style={{ fontSize: 10, fontWeight: 800, lineHeight: 1.3, color: b.unlocked ? b.color : 'inherit' }}>
                {b.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Progress Bars ─────────────────────────────────────────────────── */}
      <div className="game-card" style={{
        background: '#1a1a2e',
        border: '1px solid rgba(255,255,255,0.06)',
        padding: 24,
      }}>
        <h3 style={{ fontWeight: 900, fontSize: 17, marginBottom: 20 }}>📈 Learning Progress</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {[
            { label: 'Words Learned', val: userData.stats.wordsLearned, max: TOTAL_WORDS, gradient: 'linear-gradient(90deg,#3b82f6,#818cf8)', glow: 'rgba(59,130,246,0.4)' },
            { label: 'Level Progress', val: xpProgress, max: 100, gradient: 'linear-gradient(90deg,#a855f7,#ec4899)', glow: 'rgba(168,85,247,0.4)' },
            { label: 'Accuracy',       val: userData.stats.accuracy, max: 100, gradient: 'linear-gradient(90deg,#22c55e,#16a34a)', glow: 'rgba(34,197,94,0.4)' },
            { label: 'Weak Words Mastered', val: weakWordsStats.mastered, max: Math.max(weakWordsStats.total, 1), gradient: 'linear-gradient(90deg,#f97316,#ef4444)', glow: 'rgba(249,115,22,0.4)' },
          ].map(({ label, val, max, gradient, glow }) => {
            const pct = Math.min((val / max) * 100, 100);
            return (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                  <span>{label}</span>
                  <span style={{ opacity: 0.5 }}>{Math.round(pct)}%</span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill-animated"
                    style={{ width: `${pct}%`, background: gradient, boxShadow: `0 0 8px ${glow}` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>


      {/* ── Detailed sections ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <DailyChallenge userData={userData} onSaveUserData={onSaveUserData} />
        <Leaderboard userData={userData} currentUid={user?.uid} />

      </div>

      <AchievementsPanel userData={userData} />
    </div>
  );
};

export default Dashboard;
