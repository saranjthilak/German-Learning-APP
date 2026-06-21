import React, { useState, useEffect } from 'react';
import { StorageManager } from './utils/storage';
import { UserData } from './types';
import { AuthProvider, useAuth, loadCloudData, saveCloudData } from './contexts/AuthContext';
import Dashboard from './components/Dashboard';
import GameMenu from './components/GameMenu';
import MatchingGame from './components/games/MatchingGame';
import MemoryGame from './components/games/MemoryGame';
import QuizGame from './components/games/QuizGame';
import TypingGame from './components/games/TypingGame';
import PronunciationGame from './components/games/PronunciationGame';
import Settings from './components/Settings';
import ThemeToggle from './components/ThemeToggle';
import AuthModal from './components/AuthModal';
import './index.css';

type GameType = 'matching' | 'memory' | 'quiz' | 'typing' | 'pronunciation' | null;

// ─── Inner app (needs AuthContext) ────────────────────────────────────────────

const AppInner: React.FC = () => {
  const { user, loading: authLoading, signOut } = useAuth();

  const [userData, setUserData]       = useState<UserData>(StorageManager.getUserData());
  const [currentGame, setCurrentGame] = useState<GameType>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [darkMode, setDarkMode]       = useState(userData.darkMode);
  const [syncing, setSyncing]         = useState(false);

  // ── Dark mode effect ──────────────────────────────────────────────────────
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // ── Streak check on mount ─────────────────────────────────────────────────
  useEffect(() => {
    StorageManager.checkStreakResetNeeded();
  }, []);

  // ── Load cloud data when user logs in ────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      // Guest: load from localStorage
      setUserData(StorageManager.getUserData());
      return;
    }
    // Logged in: load from Firestore
    setSyncing(true);
    loadCloudData(user.uid).then((cloudData) => {
      if (cloudData) {
        setUserData(cloudData);
        // Keep localStorage in sync for offline fallback
        StorageManager.saveUserData(cloudData);
      }
      setSyncing(false);
    });
  }, [user, authLoading]);

  // ── Hash-based routing ────────────────────────────────────────────────────
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'settings') {
        setShowSettings(true);
        setCurrentGame(null);
      } else if (hash.startsWith('game-')) {
        const game = hash.replace('game-', '') as GameType;
        setCurrentGame(game);
        setShowSettings(false);
      } else {
        setShowSettings(false);
        setCurrentGame(null);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // ── Game completion ───────────────────────────────────────────────────────
  const handleGameComplete = (xpEarned: number, accuracy: number, correctAnswers: number, totalAnswers: number) => {
    const updated = StorageManager.updateStats(xpEarned, accuracy, correctAnswers, totalAnswers, currentGame || '');
    setUserData(updated);
    if (user) saveCloudData(user.uid, updated);
    window.location.hash = '';
  };

  // ── Dark mode toggle ──────────────────────────────────────────────────────
  const handleToggleDarkMode = () => {
    const newDarkMode = StorageManager.toggleDarkMode();
    setDarkMode(newDarkMode);
    const updated = { ...userData, darkMode: newDarkMode };
    setUserData(updated);
    if (user) saveCloudData(user.uid, updated);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const renderContent = () => {
    if (showSettings) {
      return <Settings onClose={() => window.location.hash = ''} userData={userData} />;
    }
    if (currentGame === 'matching') return <MatchingGame onComplete={handleGameComplete} />;
    if (currentGame === 'memory')   return <MemoryGame   onComplete={handleGameComplete} />;
    if (currentGame === 'quiz')     return <QuizGame     onComplete={handleGameComplete} />;
    if (currentGame === 'typing')   return <TypingGame   onComplete={handleGameComplete} />;
    if (currentGame === 'pronunciation') return <PronunciationGame onComplete={handleGameComplete} />;

    return (
      <>
        <Dashboard userData={userData} user={user} syncing={syncing} />
        <GameMenu onSelectGame={(game) => window.location.hash = `game-${game}`} />
      </>
    );
  };

  // ── Avatar initials helper ────────────────────────────────────────────────
  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 to-green-50'}`}>
      <header className={`${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg sticky top-0 z-50`}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-primary">🇩🇪 German Vocab</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Sync indicator */}
            {syncing && (
              <span className="text-xs text-blue-400 animate-pulse font-medium">⟳ Syncing…</span>
            )}

            <button
              id="settings-btn"
              onClick={() => window.location.hash = showSettings ? '' : 'settings'}
              className="text-2xl hover:scale-110 transition-transform"
              aria-label="Settings"
            >
              ⚙️
            </button>

            <ThemeToggle darkMode={darkMode} onToggle={handleToggleDarkMode} />

            {/* Auth button / avatar */}
            {authLoading ? null : user ? (
              <div className="relative group">
                <button
                  id="user-avatar-btn"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md transition-transform hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #63b3ed 0%, #7c3aed 100%)' }}
                  title={user.displayName ?? user.email ?? 'Account'}
                >
                  {user.photoURL
                    ? <img src={user.photoURL} alt="avatar" className="w-full h-full rounded-full object-cover" />
                    : getInitials(user.displayName ?? user.email)
                  }
                </button>
                {/* Dropdown */}
                <div className="absolute right-0 top-11 hidden group-hover:flex flex-col min-w-max rounded-xl shadow-xl overflow-hidden z-50"
                  style={{ background: darkMode ? '#1e293b' : 'white', border: '1px solid rgba(0,0,0,0.1)' }}>
                  <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(0,0,0,0.07)' }}>
                    <p className="text-sm font-semibold">{user.displayName ?? 'User'}</p>
                    <p className="text-xs opacity-50">{user.email}</p>
                  </div>
                  <button
                    id="sign-out-btn"
                    onClick={signOut}
                    className="px-4 py-2.5 text-sm text-left hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            ) : (
              <button
                id="login-btn"
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105 shadow-md"
                style={{ background: 'linear-gradient(135deg, #63b3ed 0%, #7c3aed 100%)' }}
              >
                Sign In
              </button>
            )}

            {currentGame && (
              <button id="back-btn" onClick={() => window.location.hash = ''} className="button-secondary">
                Back
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {renderContent()}
      </main>

      <footer className={`${darkMode ? 'bg-gray-800' : 'bg-gray-100'} text-center py-6 mt-12`}>
        <p className="text-gray-600 dark:text-gray-400">
          Learn German A1 Vocabulary · Made with ❤️ for language learners
        </p>
      </footer>

      {/* Auth modal */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
};

// ─── Root app (wraps with AuthProvider) ──────────────────────────────────────

const App: React.FC = () => (
  <AuthProvider>
    <AppInner />
  </AuthProvider>
);

export default App;
