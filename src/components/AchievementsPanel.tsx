import React from 'react';
import { UserData } from '../types';

interface AchievementsPanelProps {
  userData: UserData;
}

const AchievementsPanel: React.FC<AchievementsPanelProps> = ({ userData }) => {
  const unlockedCount = userData.achievements.filter(a => a.unlocked).length;

  return (
    <div className="game-card bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold mb-6">🏆 All Achievements</h2>
      <p className="text-lg font-semibold text-primary mb-6">
        {unlockedCount} / {userData.achievements.length} Unlocked
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {userData.achievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`p-4 rounded-lg border-2 transition-all duration-300 ${
              achievement.unlocked
                ? 'border-primary bg-green-50 dark:bg-green-900/20'
                : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/20 opacity-60'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="text-4xl">{achievement.icon}</div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">{achievement.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {achievement.description}
                </p>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold">
                    Progress: {achievement.currentProgress} / {achievement.requirement}
                  </span>
                  {achievement.unlocked && (
                    <span className="text-xs text-green-600 dark:text-green-400 font-bold">
                      ✓ UNLOCKED
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AchievementsPanel;
