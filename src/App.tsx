import React, { useState, useEffect } from 'react';
import { StorageManager } from './utils/storage';
import { UserData } from './types';
import Dashboard from './components/Dashboard';
import GameMenu from './components/GameMenu';
import MatchingGame from './components/games/MatchingGame';
import MemoryGame from './components/games/MemoryGame';
import QuizGame from './components/games/QuizGame';
import TypingGame from './components/games/TypingGame';
import PronunciationGame from './components/games/PronunciationGame';
import Settings from './components/Settings';
import ThemeToggle from './components/ThemeToggle';
import './index.css';

type GameType = 'matching' | 'memory' | 'quiz' | 'typing' | 'pronunciation' | null;

const App: React.FC = () => {
  const [userData, setUserData] = useState<UserData>(StorageManager.getUserData());
  const [currentGame, setCurrentGame] = useState<GameType>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [darkMode, setDarkMode] = useState(userData.darkMode);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    // Check streak on app load
    StorageManager.checkStreakResetNeeded();
  }, []);

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
    handleHashChange(); // Handle initial load

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleGameComplete = (xpEarned: number, accuracy: number, correctAnswers: number, totalAnswers: number) => {
    const updated = StorageManager.updateStats(xpEarned, accuracy, correctAnswers, totalAnswers, currentGame || '');
    setUserData(updated);
    window.location.hash = '';
  };

  const handleToggleDarkMode = () => {
    const newDarkMode = StorageManager.toggleDarkMode();
    setDarkMode(newDarkMode);
    setUserData(prev => ({ ...prev, darkMode: newDarkMode }));
  };

  const renderContent = () => {
    if (showSettings) {
      return <Settings onClose={() => window.location.hash = ''} userData={userData} />;
    }

    if (currentGame === 'matching') {
      return <MatchingGame onComplete={handleGameComplete} />;
    }

    if (currentGame === 'memory') {
      return <MemoryGame onComplete={handleGameComplete} />;
    }

    if (currentGame === 'quiz') {
      return <QuizGame onComplete={handleGameComplete} />;
    }

    if (currentGame === 'typing') {
      return <TypingGame onComplete={handleGameComplete} />;
    }

    if (currentGame === 'pronunciation') {
      return <PronunciationGame onComplete={handleGameComplete} />;
    }

    return (
      <>
        <Dashboard userData={userData} />
        <GameMenu onSelectGame={(game) => window.location.hash = `game-${game}`} />
      </>
    );
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 to-green-50'}`}>
      <header className={`${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg sticky top-0 z-50`}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-primary">🇩🇪 German Vocab</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.location.hash = showSettings ? '' : 'settings'}
              className="text-2xl hover:scale-110 transition-transform"
            >
              ⚙️
            </button>
            <ThemeToggle darkMode={darkMode} onToggle={handleToggleDarkMode} />
            {currentGame && (
              <button
                onClick={() => window.location.hash = ''}
                className="button-secondary"
              >
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
    </div>
  );
};

export default App;
