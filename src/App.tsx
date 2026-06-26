import React, { useState, useEffect, useCallback } from 'react';
import { StorageManager } from './utils/storage';
import { UserData } from './types';
import { AuthProvider, useAuth, loadCloudData, saveCloudData } from './contexts/AuthContext';
import Dashboard from './components/Dashboard';
import MatchingGame from './components/games/MatchingGame';
import MemoryGame from './components/games/MemoryGame';
import QuizGame from './components/games/QuizGame';
import TypingGame from './components/games/TypingGame';
import PronunciationGame from './components/games/PronunciationGame';
import Settings from './components/Settings';
import AuthModal from './components/AuthModal';
import VoiceTutor from './components/VoiceTutor';
import Confetti from './components/Confetti';
import GameMenu from './components/GameMenu';
import ThemeToggle from './components/ThemeToggle';
import './index.css';

type GameType = 'matching' | 'memory' | 'quiz' | 'typing' | 'pronunciation' | 'voice-tutor' | null;
type Tab = 'home' | 'games' | 'tutor' | 'profile';

// ─── Inner app ────────────────────────────────────────────────────────────────

const AppInner: React.FC = () => {
  const { user, loading: authLoading } = useAuth();

  const [userData, setUserData]         = useState<UserData>(StorageManager.getUserData());
  const [currentGame, setCurrentGame]   = useState<GameType>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [syncing, setSyncing]           = useState(false);
  const [activeTab, setActiveTab]       = useState<Tab>('home');
  const [showConfetti, setShowConfetti] = useState(false);
  const [successData, setSuccessData]   = useState<{
    xp: number;
    coins: number;
    accuracy: number;
    correct: number;
    total: number;
  } | null>(null);

  // Apply dark mode state
  useEffect(() => {
    if (userData.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [userData.darkMode]);

  // Streak check
  useEffect(() => { StorageManager.checkStreakResetNeeded(); }, []);

  // Load cloud data when user logs in
  useEffect(() => {
    if (authLoading) return;
    if (!user) { setUserData(StorageManager.getUserData()); return; }
    setSyncing(true);
    loadCloudData(user.uid).then((cloudData) => {
      if (cloudData) {
        setUserData(cloudData);
        StorageManager.saveUserData(cloudData);
      }
      setSyncing(false);
    });
  }, [user, authLoading]);

  // Hash-based routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'settings') {
        setShowSettings(true); setCurrentGame(null); setActiveTab('profile');
      } else if (hash.startsWith('game-')) {
        const game = hash.replace('game-', '') as GameType;
        setCurrentGame(game); setShowSettings(false);
        setActiveTab(game === 'voice-tutor' ? 'tutor' : 'games');
      } else {
        setShowSettings(false); setCurrentGame(null);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Game completion
  const handleGameComplete = useCallback((xpEarned: number, accuracy: number, correctAnswers: number, totalAnswers: number) => {
    const updated = StorageManager.updateStats(xpEarned, accuracy, correctAnswers, totalAnswers, currentGame || '');
    setUserData(updated);
    if (user) saveCloudData(user.uid, updated);
    
    const coinsReward = 15 + (accuracy === 100 ? 10 : 0);
    setSuccessData({
      xp: xpEarned,
      coins: coinsReward,
      accuracy,
      correct: correctAnswers,
      total: totalAnswers,
    });
    setShowConfetti(true);
  }, [currentGame, user]);

  const handleSaveUserData = useCallback((updated: UserData) => {
    setUserData(updated);
    if (user) saveCloudData(user.uid, updated);
  }, [user]);

  // Navigate to tab
  const goTab = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'home')    { window.location.hash = ''; }
    if (tab === 'games')   { window.location.hash = ''; setCurrentGame(null); setShowSettings(false); }
    if (tab === 'tutor')   { window.location.hash = 'game-voice-tutor'; }
    if (tab === 'profile') { window.location.hash = 'settings'; }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  // ── Render content ──────────────────────────────────────────────────────────
  const renderContent = () => {
    if (showSettings) return <Settings onClose={() => { window.location.hash = ''; }} userData={userData} onSaveUserData={handleSaveUserData} />;
    if (currentGame === 'matching')     return <MatchingGame onComplete={handleGameComplete} />;
    if (currentGame === 'memory')       return <MemoryGame   onComplete={handleGameComplete} />;
    if (currentGame === 'quiz')         return <QuizGame     onComplete={handleGameComplete} />;
    if (currentGame === 'typing')       return <TypingGame   onComplete={handleGameComplete} />;
    if (currentGame === 'pronunciation') return <PronunciationGame onComplete={handleGameComplete} />;
    if (currentGame === 'voice-tutor')  return <VoiceTutor onClose={() => { window.location.hash = ''; }} />;

    if (activeTab === 'games') {
      return (
        <div className="animate-slide-up">
          <GameMenu onSelectGame={(game: 'matching' | 'memory' | 'quiz' | 'typing' | 'pronunciation' | 'voice-tutor') => { window.location.hash = `game-${game}`; }} />
        </div>
      );
    }

    return (
      <Dashboard
        userData={userData}
        user={user}
        syncing={syncing}
        onStartTutor={() => { window.location.hash = 'game-voice-tutor'; }}
        onSelectGame={(game) => { window.location.hash = `game-${game}`; }}
      />
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text-main)', fontFamily: "'Nunito', sans-serif" }}>

      {/* Confetti overlay */}
      {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}

      {/* ── Desktop Sidebar ──────────────────────────────────────────────── */}
      {!currentGame && (
        <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 p-6 z-40 border-r border-slate-200 dark:border-slate-800"
          style={{ background: 'var(--color-surface)', height: '100vh' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 32 }}
            onClick={() => { window.location.hash = ''; setActiveTab('home'); }}>
            <span style={{ fontSize: 32 }}>🇩🇪</span>
            <span style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.3px' }}>Deutsch</span>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 flex flex-col gap-2">
            {([
              { id: 'home',    icon: '🏠', label: 'Home'    },
              { id: 'games',   icon: '🎮', label: 'Games'   },
              { id: 'tutor',   icon: '🎙️', label: 'Tutor'   },
              { id: 'profile', icon: '👤', label: 'Profile' },
            ] as { id: Tab; icon: string; label: string }[]).map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => goTab(tab.id)}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl font-extrabold text-sm transition-all duration-200 text-left ${
                    active 
                      ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-2 border-purple-500/20' 
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border-2 border-transparent'
                  }`}
                >
                  <span style={{ fontSize: 20 }}>{tab.icon}</span>
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* User profile bottom bar */}
          {user && (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div style={{
                width: 38, height: 38, borderRadius: '50%', overflow: 'hidden',
                background: 'linear-gradient(135deg,#63b3ed,#7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 14, color: 'white', flexShrink: 0,
              }}>
                {user.photoURL
                  ? <img src={user.photoURL} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : getInitials(user.displayName ?? user.email)
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xs truncate">{user.displayName ?? 'Learner'}</p>
                <p className="text-[10px] opacity-50 truncate">{user.email}</p>
              </div>
            </div>
          )}
        </aside>
      )}

      {/* Main Content Layout Wrapper */}
      <div className={`${!currentGame ? 'md:pl-64' : ''}`}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header style={{
          background: 'var(--color-surface)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--color-border)',
          position: 'sticky', top: 0, zIndex: 30,
          padding: '0 16px',
        }}>
          <div style={{
            maxWidth: 960, margin: '0 auto',
            height: 60,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            {/* Logo */}
            <div className="flex md:hidden items-center gap-10 cursor-pointer"
              onClick={() => { window.location.hash = ''; setActiveTab('home'); }}>
              <span style={{ fontSize: 26 }}>🇩🇪</span>
              <span style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-0.3px' }}>Deutsch</span>
            </div>

            {/* Desktop Section Header */}
            <div className="hidden md:block font-extrabold text-sm opacity-60">
              {activeTab.toUpperCase()}
            </div>

            {/* Center stats strip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 16 }}>🔥</span>
                <span style={{ fontWeight: 900, fontSize: 15, color: 'var(--color-streak)' }}>{userData.stats.currentStreak}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 16 }}>⚡</span>
                <span style={{ fontWeight: 900, fontSize: 15, color: 'var(--color-xp)' }}>{userData.stats.totalXP}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 16 }}>🪙</span>
                <span style={{ fontWeight: 900, fontSize: 15, color: 'var(--color-coin)' }}>{userData.stats.coins ?? 100}</span>
              </div>
              <div style={{
                background: 'rgba(168,85,247,0.15)',
                border: '1px solid rgba(168,85,247,0.3)',
                borderRadius: 999, padding: '4px 10px',
                fontSize: 12, fontWeight: 800, color: 'var(--color-purple)',
              }}>
                Lv.{userData.stats.level}
              </div>
            </div>

            {/* Right actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {syncing && (
                <span style={{ fontSize: 11, color: '#60a5fa', fontWeight: 700 }}>⟳ Syncing…</span>
              )}
              
              <ThemeToggle 
                darkMode={userData.darkMode} 
                onToggle={() => {
                  const updatedVal = StorageManager.toggleDarkMode();
                  handleSaveUserData({ ...userData, darkMode: updatedVal });
                }} 
              />

              <button
                id="settings-btn"
                onClick={() => { window.location.hash = showSettings ? '' : 'settings'; }}
                style={{
                  background: 'rgba(255,255,255,0.07)', border: '1px solid var(--color-border)',
                  borderRadius: 10, width: 36, height: 36, cursor: 'pointer', fontSize: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s',
                }}
                title="Settings"
              >⚙️</button>

              {currentGame && (
                <button
                  id="back-btn"
                  onClick={() => { window.location.hash = ''; }}
                  className="button-secondary"
                  style={{ padding: '7px 14px', fontSize: 13, borderRadius: 10 }}
                >
                  ← Back
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px 100px' }}>
          {renderContent()}
        </main>
      </div>



      {/* Auth modal */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

      {/* Motivational Success Screen Modal */}
      {successData && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 150,
          background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16
        }}>
          <div className="glass-card animate-scale-in max-w-sm w-full p-6 text-center border border-white/10"
               style={{ background: 'var(--color-surface)', borderRadius: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: 50, marginBottom: 12 }}>🎉</div>
            <h2 className="text-2xl font-black mb-2 text-white">Lektion Beendet!</h2>
            <p className="text-xs text-purple-300 mb-6 font-bold">Awesome job! Keep up the great work.</p>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-xl p-3 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                <span className="text-2xl block mb-1">⚡</span>
                <span className="text-lg font-black block">+{successData.xp}</span>
                <span className="text-[10px] uppercase font-bold opacity-75">XP Earned</span>
              </div>
              <div className="rounded-xl p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <span className="text-2xl block mb-1">🪙</span>
                <span className="text-lg font-black block">+{successData.coins}</span>
                <span className="text-[10px] uppercase font-bold opacity-75">Coins Won</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl mb-6">
              <div className="text-[10px] uppercase font-black tracking-wider opacity-75 mb-1">Accuracy</div>
              <div className="text-base font-black">{successData.accuracy}%</div>
              <div className="text-[9px] opacity-70">({successData.correct} / {successData.total} correct)</div>
            </div>

            <button
              onClick={() => setSuccessData(null)}
              className="w-full py-3 rounded-xl font-black text-white text-xs tactile-btn"
              style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)' }}
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Root app ─────────────────────────────────────────────────────────────────

const App: React.FC = () => (
  <AuthProvider>
    <AppInner />
  </AuthProvider>
);

export default App;
