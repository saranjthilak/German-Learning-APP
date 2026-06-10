import React, { useState, useEffect } from 'react';
import { UserData } from '../types';
import { StorageManager } from '../utils/storage';

interface LeaderboardProps {
  userData: UserData;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ userData }) => {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    // Create a local leaderboard with current player
    const playerEntry = {
      id: '1',
      playerName: userData.playerName,
      level: userData.stats.level,
      totalXP: userData.stats.totalXP,
      wordsLearned: userData.stats.wordsLearned,
      accuracy: userData.stats.accuracy,
    };

    const topEntries = [playerEntry].sort((a, b) => b.totalXP - a.totalXP).slice(0, 5);
    setLeaderboard(topEntries);
  }, [userData]);

  return (
    <div className="game-card bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
      <h3 className="text-2xl font-bold mb-6">🏅 Leaderboard</h3>
      <div className="space-y-2">
        {leaderboard.map((entry, index) => (
          <div
            key={entry.id}
            className={`p-4 rounded-lg flex justify-between items-center ${
              entry.playerName === userData.playerName
                ? 'bg-primary text-white font-bold'
                : 'bg-gray-100 dark:bg-gray-700'
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold">{index + 1}.</span>
              <div>
                <p className="font-bold">{entry.playerName}</p>
                <p className="text-xs opacity-75">Level {entry.level}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold">{entry.totalXP.toLocaleString()} XP</p>
              <p className="text-xs opacity-75">{entry.accuracy}% accuracy</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Leaderboard;
