import React, { useState, useEffect } from 'react';
import { StorageManager } from '../utils/storage';
import { germanVocabulary } from '../data/vocabulary';
import { UserData } from '../types';

interface DailyChallengeProps {
  userData: UserData;
  onSaveUserData: (updated: UserData) => void;
}

const DailyChallenge: React.FC<DailyChallengeProps> = ({ userData, onSaveUserData }) => {
  const [challenge, setChallenge] = useState<any>(null);
  const [completionDate, setCompletionDate] = useState<string | null>(null);

  useEffect(() => {
    const dailyChallenge = StorageManager.getDailyChallenge();
    setChallenge(dailyChallenge);

    // Check if already completed today
    const today = new Date().toDateString();
    const todayChallenge = userData.dailyChallenges.find(c => c.date === today);
    if (todayChallenge?.completed) {
      setCompletionDate(today);
    } else {
      setCompletionDate(null);
    }
  }, [userData]);

  const handleComplete = () => {
    if (challenge) {
      const updated = StorageManager.completeDailyChallenge();
      onSaveUserData(updated);
      setCompletionDate(new Date().toDateString());
    }
  };

  if (!challenge) {
    return <div>Loading daily challenge...</div>;
  }

  return (
    <div className="game-card bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-6 rounded-lg shadow-lg border-2 border-yellow-300 dark:border-yellow-700">
      <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
        📅 Daily Challenge {completionDate && '✓'}
      </h3>

      <div className="mb-6">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          {completionDate
            ? `Completed today!`
            : 'Learn 15 random German words'}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-3xl">🔥</span>
          <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {challenge.streak} day streak
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg mb-4 max-h-40 overflow-y-auto">
        <div className="grid grid-cols-2 gap-2">
          {challenge.words.slice(0, 6).map((wordId: string) => {
            const word = germanVocabulary.find(w => w.id === wordId);
            return (
              <div key={wordId} className="text-sm">
                <span className="font-bold">{word?.german}</span> - {word?.english}
              </div>
            );
          })}
          {challenge.words.length > 6 && (
            <div className="col-span-2 text-center text-gray-500 dark:text-gray-400 text-sm">
              +{challenge.words.length - 6} more words
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleComplete}
        disabled={completionDate !== null}
        className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
          completionDate
            ? 'bg-gray-400 cursor-not-allowed'
            : 'button-primary hover:scale-105'
        }`}
      >
        {completionDate ? '✓ Completed Today!' : '▶ Start Challenge'}
      </button>
    </div>
  );
};

export default DailyChallenge;
