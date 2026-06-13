import React, { useState, useEffect } from 'react';
import { UserData } from '../types';
import { StorageManager } from '../utils/storage';
import { germanVocabulary, GermanWord } from '../data/vocabulary';
import { SpeechManager } from '../utils/speech';

interface ReviewModeProps {
  userData: UserData;
  onClose: () => void;
}

const ReviewMode: React.FC<ReviewModeProps> = ({ userData, onClose }) => {
  const [dueWords, setDueWords] = useState<GermanWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [completed, setCompleted] = useState(false);
  const [stats, setStats] = useState({ reviewed: 0, correct: 0 });

  useEffect(() => {
    const dueWordIds = StorageManager.getWordsDueForReview();
    const words = dueWordIds
      .map(id => germanVocabulary.find(w => w.id === id))
      .filter((w): w is GermanWord => w !== undefined);
    setDueWords(words);
  }, []);

  const handleRating = (score: number) => {
    const currentWord = dueWords[currentIndex];
    
    // Update spaced repetition based on rating
    // Score: 0-5 (0=again, 1=hard, 2=good, 3=easy)
    const isCorrect = score >= 2;
    StorageManager.addWeakWord(currentWord.id, isCorrect);
    if (isCorrect) StorageManager.markWordLearned(currentWord.id);
    if (isCorrect) StorageManager.markWordLearned(currentWord.id);

    setStats(prev => ({
      reviewed: prev.reviewed + 1,
      correct: prev.correct + (isCorrect ? 1 : 0)
    }));

    setRating(score);
    setShowAnswer(false);

    setTimeout(() => {
      if (currentIndex + 1 < dueWords.length) {
        setCurrentIndex(prev => prev + 1);
        setRating(null);
      } else {
        setCompleted(true);
      }
    }, 500);
  };

  if (dueWords.length === 0) {
    return (
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">📚 Review Mode</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          No words due for review right now!
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Come back later to practice words you've struggled with.
        </p>
        <button onClick={onClose} className="button-secondary">
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">🎉 Review Complete!</h1>
        <div className="space-y-4">
          <div className="game-card p-6">
            <p className="text-lg">Words Reviewed: <span className="font-bold">{stats.reviewed}</span></p>
            <p className="text-lg">Correct: <span className="font-bold text-green-600">{stats.correct}</span></p>
            <p className="text-lg">Accuracy: <span className="font-bold">{Math.round((stats.correct / stats.reviewed) * 100)}%</span></p>
          </div>
        </div>
        <button onClick={onClose} className="button-primary">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const currentWord = dueWords[currentIndex];
  const progressPercent = ((currentIndex) / dueWords.length) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">📚 Review Mode</h1>
          <p className="text-gray-600 dark:text-gray-400">Word {currentIndex + 1} of {dueWords.length}</p>
        </div>
        <button onClick={onClose} className="button-secondary">
          ✕ Close
        </button>
      </div>

      {/* Progress Bar */}
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
      </div>

      {/* Word Card */}
      <div className="game-card bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-8 rounded-lg border-2 border-purple-300 dark:border-purple-700">
        <div className="text-center space-y-4">
          <h2 className="text-5xl font-bold text-purple-600 dark:text-purple-400">{currentWord.german}</h2>
          {currentWord.article && (
            <p className="text-xl text-gray-600 dark:text-gray-400">{currentWord.article}</p>
          )}
          {currentWord.pronunciation && (
            <p className="text-lg text-gray-500 dark:text-gray-500">{currentWord.pronunciation}</p>
          )}
          <button
            onClick={() => SpeechManager.speak(currentWord.german)}
            className="button-secondary px-6 py-2"
            title="Listen to pronunciation"
          >
            🔊 Listen
          </button>
        </div>
      </div>

      {/* Answer Section */}
      {showAnswer ? (
        <div className="space-y-4">
          <div className="game-card p-6 bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700">
            <p className="text-center text-lg text-gray-600 dark:text-gray-400 mb-2">English Translation:</p>
            <h3 className="text-3xl font-bold text-center text-green-600 dark:text-green-400">{currentWord.english}</h3>
          </div>

          {/* Rating Buttons */}
          <div className="space-y-2">
            <p className="text-center font-bold text-gray-600 dark:text-gray-400">How well did you know this word?</p>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => handleRating(0)}
                className="py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors"
              >
                Again
              </button>
              <button
                onClick={() => handleRating(1)}
                className="py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors"
              >
                Hard
              </button>
              <button
                onClick={() => handleRating(2)}
                className="py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors"
              >
                Good
              </button>
              <button
                onClick={() => handleRating(3)}
                className="py-3 px-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition-colors"
              >
                Easy
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAnswer(true)}
          className="button-primary w-full text-xl py-4"
        >
          Show Answer
        </button>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="game-card p-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">Reviewed</p>
          <p className="text-2xl font-bold">{stats.reviewed}</p>
        </div>
        <div className="game-card p-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">Correct</p>
          <p className="text-2xl font-bold text-green-600">{stats.correct}</p>
        </div>
      </div>
    </div>
  );
};

export default ReviewMode;
