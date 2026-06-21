import React, { useState, useEffect } from 'react';
import { UserData } from '../types';
import { StorageManager } from '../utils/storage';
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
          <p className="text-sm">of 540 words</p>
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
        <div className={`game-card p-6 ${userData.stats.darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <p className="text-gray-600 dark:text-gray-400 text-sm">SCORE</p>
          <p className="text-3xl font-bold text-primary mt-2">{userData.stats.totalScore.toLocaleString()}</p>
        </div>

        <div className={`game-card p-6 ${userData.stats.darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <p className="text-gray-600 dark:text-gray-400 text-sm">GAMES PLAYED</p>
          <p className="text-3xl font-bold text-primary mt-2">{userData.stats.gamesCompleted}</p>
        </div>

        <div className={`game-card p-6 ${userData.stats.darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <p className="text-gray-600 dark:text-gray-400 text-sm">CURRENT STREAK</p>
          <p className="text-3xl font-bold text-primary mt-2">
            {userData.stats.currentStreak} 🔥
          </p>
        </div>

        <div className={`game-card p-6 ${userData.stats.darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <p className="text-gray-600 dark:text-gray-400 text-sm">BEST STREAK</p>
          <p className="text-3xl font-bold text-primary mt-2">{userData.stats.bestStreak} 🏆</p>
        </div>
      </div>

      {/* Achievements Quick View */}
      <div className={`game-card p-6 ${userData.stats.darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
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
