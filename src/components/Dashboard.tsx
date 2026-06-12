import React, { useState, useEffect } from 'react';
import { UserData } from '../types';
import { StorageManager } from '../utils/storage';
import { germanVocabulary } from '../data/vocabulary';
import AchievementsPanel from './AchievementsPanel';
import Leaderboard from './Leaderboard';
import DailyChallenge from './DailyChallenge';
import ReviewMode from './ReviewMode';
import FlashcardMode from './FlashcardMode';

interface DashboardProps {
  userData: UserData;
}

const Dashboard: React.FC<DashboardProps> = ({ userData }) => {
  const [unlockedAchievements, setUnlockedAchievements] = useState(0);
  const [showReviewMode, setShowReviewMode] = useState(false);
  const [showFlashcardMode, setShowFlashcardMode] = useState(false);

  const TOTAL_WORDS = germanVocabulary.length;

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'review') {
        setShowReviewMode(true);
        setShowFlashcardMode(false);
      } else if (hash === 'flashcard') {
        setShowFlashcardMode(true);
        setShowReviewMode(false);
      } else {
        setShowReviewMode(false);
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

  if (showReviewMode) {
    return <ReviewMode userData={userData} onClose={() => window.location.hash = ''} />;
  }

  if (showFlashcardMode) {
    return <FlashcardMode onClose={() => window.location.hash = ''} />;
  }

  return (
    <div className="space-y-8">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`game-card p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-300 dark:border-purple-700`}>
          <h3 className="text-2xl font-bold mb-2">📚 Review Mode</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Practice words due for review using spaced repetition
          </p>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm">
              <span className="font-bold text-purple-600">{weakWordsStats.due}</span> due for review
            </div>
            <div className="text-sm">
              <span className="font-bold text-green-600">{weakWordsStats.mastered}</span> mastered
            </div>
          </div>
          <button
            onClick={() => window.location.hash = 'review'}
            className="button-primary w-full"
          >
            Start Review
          </button>
        </div>

        <div className={`game-card p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700bg-gradient-to-br from-blue-50 to-teal-50 dark:from-blue-900/20 dark:to-teal-900/20 border-2 border-blue-300 dark:border-blue-700`}>
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
        <DailyChallenge userData={userData} />
        <Leaderboard userData={userData} />
      </div>

      {/* Detailed Achievements */}
      <AchievementsPanel userData={userData} />
    </div>
  );
};

export default Dashboard;
