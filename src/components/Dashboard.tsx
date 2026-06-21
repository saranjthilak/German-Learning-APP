import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { UserData } from '../types';
import { StorageManager } from '../utils/storage';
import { germanVocabulary } from '../data/vocabulary';
import AchievementsPanel from './AchievementsPanel';
import Leaderboard from './Leaderboard';
import DailyChallenge from './DailyChallenge';
import FlashcardMode from './FlashcardMode';

interface DashboardProps {
  userData: UserData;
  user?: User | null;
  syncing?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ userData, user, syncing }) => {
  const [unlockedAchievements, setUnlockedAchievements] = useState(0);
  const [showFlashcardMode, setShowFlashcardMode] = useState(false);

  const TOTAL_WORDS = germanVocabulary.length;

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'flashcard') {
        setShowFlashcardMode(true);
      } else {
        setShowFlashcardMode(false);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Handle initial load

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const count = userData.achievements.filter(a => a.unlocked).length;
    setUnlockedAchievements(count);
  }, [userData.achievements]);

  const weakWordsStats = StorageManager.getWeakWordsStats();

  const getLevelName = (level: number): string => {
    if (level < 2) return 'Beginner';
    if (level < 5) return 'Explorer';
    if (level < 10) return 'Learner';
    if (level < 15) return 'Speaker';
    return 'Master';
  };

  const getNextLevelXP = (level: number): number => {
    return (level + 1) * 100;
  };

  const currentLevelXP = userData.stats.level * 100;
  const nextLevelXP = getNextLevelXP(userData.stats.level);
  const xpProgress = ((userData.stats.totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;

  if (showFlashcardMode) {
    return <FlashcardMode onClose={() => window.location.hash = ''} />;
  }

  return (
    <div className="space-y-8">

      {/* ── User welcome banner ───────────────────────────────────────── */}
      {user ? (
        <div
          className="rounded-2xl px-6 py-4 flex items-center justify-between"
          style={{
            background: 'linear-gradient(135deg, rgba(99,179,237,0.15) 0%, rgba(124,58,237,0.15) 100%)',
            border: '1px solid rgba(99,179,237,0.25)',
          }}
        >
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #63b3ed 0%, #7c3aed 100%)' }}
            >
              {user.photoURL
                ? <img src={user.photoURL} alt="avatar" className="w-full h-full rounded-full object-cover" />
                : (user.displayName ?? user.email ?? '?').slice(0, 2).toUpperCase()
              }
            </div>
            <div>
              <p className="font-semibold text-sm">
                Welcome back, {user.displayName?.split(' ')[0] ?? 'Learner'}! 👋
              </p>
              <p className="text-xs opacity-50">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {syncing ? (
              <span className="text-xs text-blue-400 animate-pulse font-medium">⟳ Syncing…</span>
            ) : (
              <span className="text-xs text-green-400 font-medium">☁ Progress synced</span>
            )}
          </div>
        </div>
      ) : (
        <div
          className="rounded-2xl px-6 py-3 flex items-center justify-between"
          style={{
            background: 'rgba(251,191,36,0.08)',
            border: '1px solid rgba(251,191,36,0.2)',
          }}
        >
          <p className="text-sm opacity-70">🔒 Playing as guest — progress saved locally only.</p>
          <span className="text-xs opacity-50">Sign in to sync across devices</span>
        </div>
      )}

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Level Card */}
        <div className="game-card stat-box">
          <p className="text-sm font-semibold opacity-90">LEVEL</p>
          <h2 className="text-4xl font-bold my-2">{userData.stats.level}</h2>
          <p className="text-sm">{getLevelName(userData.stats.level)}</p>
        </div>

        {/* XP Card */}
        <div className="game-card stat-box bg-gradient-to-br from-accent to-blue-600">
          <p className="text-sm font-semibold opacity-90">TOTAL XP</p>
          <h2 className="text-4xl font-bold my-2">{userData.stats.totalXP.toLocaleString()}</h2>
          <div className="progress-bar mt-2 bg-white/20">
            <div className="progress-fill bg-white" style={{ width: `${xpProgress}%` }}></div>
          </div>
        </div>

        {/* Words Learned */}
        <div className="game-card stat-box bg-gradient-to-br from-purple-500 to-pink-500">
          <p className="text-sm font-semibold opacity-90">WORDS LEARNED</p>
          <h2 className="text-4xl font-bold my-2">{userData.stats.wordsLearned}</h2>
          <p className="text-sm">of {TOTAL_WORDS} words</p>
        </div>

        {/* Accuracy */}
        <div className="game-card stat-box bg-gradient-to-br from-orange-500 to-red-500">
          <p className="text-sm font-semibold opacity-90">ACCURACY</p>
          <h2 className="text-4xl font-bold my-2">{userData.stats.accuracy}%</h2>
          <p className="text-sm">Avg accuracy</p>
        </div>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={"game-card p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"}>
          <p className="text-gray-600 dark:text-gray-400 text-sm">SCORE</p>
          <p className="text-3xl font-bold text-primary mt-2">{userData.stats.totalScore.toLocaleString()}</p>
        </div>

        <div className={"game-card p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"}>
          <p className="text-gray-600 dark:text-gray-400 text-sm">GAMES PLAYED</p>
          <p className="text-3xl font-bold text-primary mt-2">{userData.stats.gamesCompleted}</p>
        </div>

        <div className={"game-card p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"}>
          <p className="text-gray-600 dark:text-gray-400 text-sm">CURRENT STREAK</p>
          <p className="text-3xl font-bold text-primary mt-2">
            {userData.stats.currentStreak} 🔥
          </p>
        </div>

        <div className={"game-card p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"}>
          <p className="text-gray-600 dark:text-gray-400 text-sm">BEST STREAK</p>
          <p className="text-3xl font-bold text-primary mt-2">{userData.stats.bestStreak} 🏆</p>
        </div>
      </div>

      {/* Learning Modes */}
      <div className="grid grid-cols-1 gap-4">
        <div className="game-card p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-blue-50 to-teal-50 dark:from-blue-900/20 dark:to-teal-900/20 border-2 border-blue-300 dark:border-blue-700">
          <h3 className="text-2xl font-bold mb-2">🃏 Flashcard Mode</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Review vocabulary with interactive flashcards
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
            Choose a category and practice at your own pace
          </p>
          <button
            onClick={() => window.location.hash = 'flashcard'}
            className="button-primary w-full"
          >
            Start Flashcards
          </button>
        </div>
      </div>

      {/* Progress Chart */}
      <div className={"game-card p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"}>
        <h3 className="text-2xl font-bold mb-4">📈 Learning Progress</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold">Words Learned</span>
              <span className="text-sm">{userData.stats.wordsLearned} / {TOTAL_WORDS}</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill bg-gradient-to-r from-blue-500 to-purple-500" 
                style={{ width: `${(userData.stats.wordsLearned / TOTAL_WORDS) * 100}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold">Level Progress</span>
              <span className="text-sm">Level {userData.stats.level}</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill bg-gradient-to-r from-green-500 to-teal-500" 
                style={{ width: `${xpProgress}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold">Accuracy</span>
              <span className="text-sm">{userData.stats.accuracy}%</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill bg-gradient-to-r from-orange-500 to-red-500" 
                style={{ width: `${userData.stats.accuracy}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold">Weak Words Mastered</span>
              <span className="text-sm">{weakWordsStats.mastered} / {weakWordsStats.total}</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill bg-gradient-to-r from-purple-500 to-pink-500" 
                style={{ width: `${weakWordsStats.total > 0 ? (weakWordsStats.mastered / weakWordsStats.total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Achievements Quick View */}
      <div className={"game-card p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"}>
        <h3 className="text-2xl font-bold mb-4">🏆 Achievements</h3>
        <p className="text-lg font-semibold text-primary mb-4">
          {unlockedAchievements} / {userData.achievements.length} Unlocked
        </p>
        <div className="flex flex-wrap gap-3">
          {userData.achievements.slice(0, 6).map(achievement => (
            <div
              key={achievement.id}
              className={`text-3xl ${achievement.unlocked ? 'opacity-100' : 'opacity-30 grayscale'} hover:scale-110 transition-transform cursor-pointer`}
              title={achievement.name}
            >
              {achievement.icon}
            </div>
          ))}
        </div>
      </div>

      {/* Main Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <DailyChallenge />
        <Leaderboard userData={userData} />
      </div>

      {/* Detailed Achievements */}
      <AchievementsPanel userData={userData} />
    </div>
  );
};

export default Dashboard;
