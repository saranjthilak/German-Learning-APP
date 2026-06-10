import React, { useState } from 'react';
import { UserData } from '../types';
import { StorageManager } from '../utils/storage';

interface SettingsProps {
  onClose: () => void;
  userData: UserData;
}

const Settings: React.FC<SettingsProps> = ({ onClose, userData }) => {
  const [playerName, setPlayerName] = useState(userData.playerName);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleSaveName = () => {
    StorageManager.setPlayerName(playerName);
    alert('Player name updated!');
  };

  const handleReset = () => {
    StorageManager.clearAllData();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">⚙️ Settings</h2>
          <button
            onClick={onClose}
            className="text-2xl hover:scale-110 transition-transform"
          >
            ✕
          </button>
        </div>

        {/* Player Name */}
        <div>
          <label className="block text-sm font-semibold mb-2">Player Name</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-black dark:text-white"
            placeholder="Enter your name"
          />
          <button
            onClick={handleSaveName}
            className="button-primary w-full mt-2"
          >
            Save Name
          </button>
        </div>

        {/* Statistics */}
        <div className="space-y-3 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <h3 className="font-bold text-lg">📊 Your Statistics</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-600 dark:text-gray-400">Total XP</p>
              <p className="font-bold">{userData.stats.totalXP}</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Level</p>
              <p className="font-bold">{userData.stats.level}</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Words Learned</p>
              <p className="font-bold">{userData.stats.wordsLearned}</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Games Played</p>
              <p className="font-bold">{userData.stats.gamesCompleted}</p>
            </div>
          </div>
        </div>

        {/* Export Data */}
        <div>
          <button
            onClick={() => {
              const dataStr = JSON.stringify(userData, null, 2);
              const dataBlob = new Blob([dataStr], { type: 'application/json' });
              const url = URL.createObjectURL(dataBlob);
              const link = document.createElement('a');
              link.href = url;
              link.download = 'german-vocab-progress.json';
              link.click();
            }}
            className="button-secondary w-full"
          >
            📥 Export Progress
          </button>
        </div>

        {/* Reset Data */}
        <div>
          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors"
            >
              🔄 Reset All Data
            </button>
          ) : (
            <div className="space-y-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg">
              <p className="font-bold text-red-600 dark:text-red-400">
                Are you sure? This cannot be undone!
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="flex-1 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700"
                >
                  Yes, Reset
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-2 bg-gray-400 text-white font-bold rounded hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* About */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-300 dark:border-blue-700">
          <h3 className="font-bold mb-2">ℹ️ About</h3>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            German A1 Vocabulary Learning Game
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            Version 1.0 · Made for language learners
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
