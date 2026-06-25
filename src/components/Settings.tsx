import React, { useState } from 'react';
import { UserData } from '../types';
import { StorageManager } from '../utils/storage';

interface SettingsProps {
  onClose: () => void;
  userData: UserData;
  onSaveUserData: (updated: UserData) => void;
}

const Settings: React.FC<SettingsProps> = ({ onClose, userData, onSaveUserData }) => {
  const [playerName, setPlayerName]   = useState(userData.playerName);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleSaveName = () => {
    StorageManager.setPlayerName(playerName);
    const updated = StorageManager.getUserData();
    onSaveUserData(updated);
    alert('Player name updated!');
  };

  const handleReset = () => {
    StorageManager.clearAllData();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto" style={{
        background: '#1a1a2e',
        border: '1px solid rgba(255,255,255,0.1)',
        color: 'white',
      }}>
        <div className="flex justify-between items-center pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 className="text-xl font-bold">⚙️ Settings</h2>
          <button
            onClick={onClose}
            className="text-xl hover:scale-110 transition-transform"
          >
            ✕
          </button>
        </div>

        {/* Player Name */}
        <div>
          <label className="block text-xs font-semibold mb-1 opacity-70">Player Name</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-600 rounded-lg bg-gray-900 text-white text-sm"
            placeholder="Enter your name"
          />
          <button
            onClick={handleSaveName}
            className="button-primary w-full mt-2 py-1.5 text-sm"
          >
            Save Name
          </button>
        </div>

        {/* Statistics */}
        <div className="p-3 bg-gray-900/60 rounded-lg border border-white/5">
          <h3 className="font-bold text-sm mb-2">📊 Your Statistics</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="opacity-50">Total XP</p>
              <p className="font-bold text-sm text-yellow-400">{userData.stats.totalXP}</p>
            </div>
            <div>
              <p className="opacity-50">Level</p>
              <p className="font-bold text-sm text-purple-400">{userData.stats.level}</p>
            </div>
            <div>
              <p className="opacity-50">Words Learned</p>
              <p className="font-bold text-sm text-blue-400">{userData.stats.wordsLearned}</p>
            </div>
            <div>
              <p className="opacity-50">Games Played</p>
              <p className="font-bold text-sm text-green-400">{userData.stats.gamesCompleted}</p>
            </div>
          </div>
        </div>

        {/* AI Tutor Status */}
        <div className="p-3 rounded-lg border border-green-500/20 bg-green-500/5">
          <h3 className="font-bold text-sm mb-1 text-green-400">🎙️ AI Voice Tutor</h3>
          <p className="text-[11px] opacity-70 leading-relaxed">
            The AI tutor is powered by <strong>Gemini 2.5 Flash</strong>. No API key setup required — just start speaking!
          </p>
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
            className="button-secondary w-full py-1.5 text-xs"
          >
            📥 Export Progress
          </button>
        </div>

        {/* Reset Data */}
        <div>
          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-bold rounded-lg transition-colors"
            >
              🔄 Reset All Data
            </button>
          ) : (
            <div className="space-y-2 p-3 bg-red-950/20 border border-red-500/30 rounded-lg">
              <p className="font-bold text-red-400 text-xs text-center">
                Are you sure? This cannot be undone!
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="flex-1 py-1.5 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700"
                >
                  Yes, Reset
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-1.5 bg-gray-700 text-white text-xs font-bold rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* About */}
        <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/10 text-center">
          <h3 className="font-bold text-xs mb-1 text-blue-400">ℹ️ About</h3>
          <p className="text-[11px] opacity-75">
            German A1/A2 Vocabulary Learning Game
          </p>
          <p className="text-[10px] opacity-50 mt-1">
            Version 1.0 · Made for language learners
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
