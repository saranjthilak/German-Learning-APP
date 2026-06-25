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
import './index.css';

type GameType = 'matching' | 'memory' | 'quiz' | 'typing' | 'pronunciation' | 'voice-tutor' | null;
type Tab = 'home' | 'games' | 'tutor' | 'profile';

// ─── Inner app ────────────────────────────────────────────────────────────────

const AppInner: React.FC = () => {
  const { user, loading: authLoading, signOut } = useAuth();

  const [userData, setUserData]         = useState<UserData>(StorageManager.getUserData());
  const [currentGame, setCurrentGame]   = useState<GameType>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [syncing, setSyncing]           = useState(false);
  const [activeTab, setActiveTab]       = useState<Tab>('home');
  const [showConfetti, setShowConfetti] = useState(false);

  // Force dark mode always
  useEffect(() => { document.documentElement.classList.add('dark'); }, []);

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
    setShowConfetti(true);
    window.location.hash = '';
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
    <div style={{ minHeight: '100vh', background: '#111827', color: 'white', fontFamily: "'Nunito', sans-serif" }}>

      {/* Confetti overlay */}
      {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header style={{
        background: 'rgba(17,24,39,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        position: 'sticky', top: 0, zIndex: 100,
        padding: '0 16px',
      }}>
        <div style={{
          maxWidth: 960, margin: '0 auto',
          height: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
            onClick={() => { window.location.hash = ''; setActiveTab('home'); }}>
            <span style={{ fontSize: 26 }}>🇩🇪</span>
            <span style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-0.3px' }}>Deutsch</span>
          </div>

          {/* Center stats strip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 16 }}>🔥</span>
              <span style={{ fontWeight: 900, fontSize: 15, color: '#fb923c' }}>{userData.stats.currentStreak}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 16 }}>⚡</span>
              <span style={{ fontWeight: 900, fontSize: 15, color: '#fbbf24' }}>{userData.stats.totalXP}</span>
            </div>
            <div style={{
              background: 'rgba(168,85,247,0.2)',
              border: '1px solid rgba(168,85,247,0.35)',
              borderRadius: 999, padding: '4px 10px',
              fontSize: 12, fontWeight: 800, color: '#c084fc',
            }}>
              Lv.{userData.stats.level}
            </div>
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {syncing && (
              <span style={{ fontSize: 11, color: '#60a5fa', fontWeight: 700 }}>⟳ Syncing…</span>
            )}
            <button
              id="settings-btn"
              onClick={() => { window.location.hash = showSettings ? '' : 'settings'; }}
              style={{
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, width: 36, height: 36, cursor: 'pointer', fontSize: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
              }}
              title="Settings"
            >⚙️</button>

            {authLoading ? null : user ? (
              <div style={{ position: 'relative' }} className="group">
                <button
                  id="user-avatar-btn"
                  style={{
                    width: 36, height: 36, borderRadius: '50%', overflow: 'hidden',
                    background: 'linear-gradient(135deg,#63b3ed,#7c3aed)',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 13, color: 'white',
                    transition: 'transform 0.15s',
                  }}
                  title={user.displayName ?? user.email ?? 'Account'}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
                >
                  {user.photoURL
                    ? <img src={user.photoURL} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    : getInitials(user.displayName ?? user.email)
                  }
                </button>
                <div className="absolute right-0 top-11 hidden group-hover:flex flex-col min-w-max rounded-xl shadow-xl overflow-hidden z-50"
                  style={{ background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', top: 42, right: 0 }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <p style={{ fontWeight: 800, fontSize: 14 }}>{user.displayName ?? 'User'}</p>
                    <p style={{ fontSize: 11, opacity: 0.4 }}>{user.email}</p>
                  </div>
                  <button
                    id="sign-out-btn"
                    onClick={signOut}
                    style={{
                      padding: '10px 16px', textAlign: 'left', fontSize: 13,
                      color: '#f87171', background: 'transparent', border: 'none', cursor: 'pointer',
                      fontFamily: "'Nunito', sans-serif", fontWeight: 700,
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    Sign out
                  </button>
                </div>
              </div>
            ) : (
              <button
                id="login-btn"
                onClick={() => setShowAuthModal(true)}
                style={{
                  padding: '8px 16px', borderRadius: 12,
                  background: 'linear-gradient(135deg,#63b3ed,#7c3aed)',
                  color: 'white', fontWeight: 800, fontSize: 13,
                  border: 'none', cursor: 'pointer',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  fontFamily: "'Nunito', sans-serif",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(99,179,237,0.4)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = ''; }}
              >
                Sign In
              </button>
            )}

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

      {/* ── Bottom Navigation Bar (mobile-friendly) ──────────────────────── */}
      {!currentGame && !showSettings && (
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'rgba(17,24,39,0.97)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', justifyContent: 'space-around',
          padding: '10px 0 16px',
          zIndex: 100,
        }}>
          {([
            { id: 'home',    icon: '🏠', label: 'Home'    },
            { id: 'games',   icon: '🎮', label: 'Games'   },
            { id: 'tutor',   icon: '🎙️', label: 'Tutor'   },
            { id: 'profile', icon: '👤', label: 'Profile' },
          ] as { id: Tab; icon: string; label: string }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => goTab(tab.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '4px 20px',
                color: activeTab === tab.id ? '#818cf8' : 'rgba(255,255,255,0.35)',
                transition: 'color 0.15s',
                fontFamily: "'Nunito', sans-serif",
              }}
            >
              <span style={{ fontSize: 22 }}>{tab.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 800 }}>{tab.label}</span>
              {activeTab === tab.id && (
                <div style={{
                  position: 'absolute', bottom: 6, width: 24, height: 3,
                  background: '#818cf8', borderRadius: 999,
                }} />
              )}
            </button>
          ))}
        </nav>
      )}

      {/* Auth modal */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
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
