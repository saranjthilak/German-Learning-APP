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

  // Ambient Daily Goal Progress
  const gameSessions = userData.gameSessions ?? [];
  const todayStr = new Date().toDateString();
  const todaySessions = gameSessions.filter(s => new Date(s.timestamp).toDateString() === todayStr);
  const todayXP = todaySessions.reduce((sum, s) => sum + s.xpEarned, 0);
  const DAILY_GOAL_XP = 50;
  const progressPct = Math.min(100, (todayXP / DAILY_GOAL_XP) * 100);

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
        const local = StorageManager.getUserData();
        // If local data is ahead of cloud data, merge and push to cloud
        if (local.stats.totalXP > cloudData.stats.totalXP) {
          const merged = { ...cloudData, ...local, stats: local.stats };
          setUserData(merged);
          StorageManager.saveUserData(merged);
          saveCloudData(user.uid, merged);
        } else {
          setUserData(cloudData);
          StorageManager.saveUserData(cloudData);
        }
      } else {
        setUserData(StorageManager.getUserData());
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
    
    // Direct ambient reward celebration: run confetti and go back to dashboard
    setShowConfetti(true);
    setCurrentGame(null);
    window.location.hash = '';
  }, [currentGame, user]);

  const handleSaveUserData = useCallback((updated: UserData) => {
    StorageManager.saveUserData(updated);
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

      {/* Main Content Layout Wrapper */}
      <div>

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
            <div className="flex md:hidden items-center gap-2 cursor-pointer"
              onClick={() => { window.location.hash = ''; setActiveTab('home'); }}>
              <span style={{ fontSize: 24 }}>🇩🇪</span>
              <span style={{ fontWeight: 900, fontSize: 16, letterSpacing: '-0.3px' }} className="hidden sm:inline">Deutsch</span>
            </div>

            {/* Desktop Section Header */}
            <div className="hidden md:block font-extrabold text-sm opacity-60">
              {activeTab.toUpperCase()}
            </div>

            {/* Center stats strip */}
            <div className="flex items-center gap-2 sm:gap-4 md:gap-5">
              <div className="flex items-center gap-1 bg-orange-500/10 dark:bg-orange-500/15 border border-orange-500/20 px-2 sm:px-2.5 py-0.5 rounded-full shadow-sm shadow-orange-500/5" title="Learning Streak">
                <span className="text-sm sm:text-base">🔥</span>
                <span className="font-extrabold text-xs sm:text-sm text-orange-500">{userData.stats.currentStreak}d</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm sm:text-base">⚡</span>
                <span className="font-extrabold text-xs sm:text-sm text-yellow-500">{userData.stats.totalXP}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm sm:text-base">🪙</span>
                <span className="font-extrabold text-xs sm:text-sm text-amber-500">{userData.stats.coins ?? 100}</span>
              </div>
              <div className="bg-purple-500/15 border border-purple-500/30 rounded-full px-2 py-0.5 sm:px-3 text-[10px] sm:text-xs font-black text-purple-600 dark:text-purple-400">
                Lv.{userData.stats.level}
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              {syncing && (
                <span className="text-[9px] sm:text-xs text-blue-400 font-extrabold">⟳ Syncing…</span>
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
                  borderRadius: 10, width: 32, height: 32, cursor: 'pointer', fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s',
                }}
                className="sm:w-9 sm:h-9 sm:text-base"
                title="Settings"
              >⚙️</button>

              {currentGame && (
                <button
                  id="back-btn"
                  onClick={() => { window.location.hash = ''; }}
                  className="button-secondary px-2 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs rounded-xl"
                  style={{ borderRadius: 10 }}
                >
                  ← Back
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Thin ambient progress bar below the header */}
        <div className="w-full h-1 bg-slate-200 dark:bg-slate-800 overflow-hidden relative z-20">
          <div 
            className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
            title={`Daily Goal Progress: ${todayXP}/${DAILY_GOAL_XP} XP`}
          />
        </div>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px 100px' }}>
          {renderContent()}
        </main>
      </div>

      {/* Auth modal */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      {/* ── Global Bottom Navigation Bar (underneath content) ─────────────── */}
      {!currentGame && !showSettings && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-[#121826]/75 backdrop-blur-lg flex justify-around items-center py-2 px-4 shadow-lg max-w-lg mx-auto sm:rounded-t-3xl sm:border-x sm:bottom-2 sm:shadow-2xl"
          style={{ transition: 'all 0.3s' }}>
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
                className={`flex flex-col items-center justify-center gap-0.5 py-1 px-4 rounded-2xl transition-all duration-200 font-extrabold text-[10px] sm:text-[11px] relative outline-none hover:scale-105 ${
                  active 
                    ? 'text-purple-600 dark:text-purple-400 scale-105' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-purple-500 dark:hover:text-purple-400'
                }`}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <span className="text-xl sm:text-2xl">{tab.icon}</span>
                <span>{tab.label}</span>
                {active && (
                  <div className="absolute bottom-0 w-8 h-0.5 bg-purple-500 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>
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
