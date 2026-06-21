import React, { useState, useEffect } from 'react';
import { GermanWord, getCategories, getRandomWords, getRandomWordsByCategory } from '../data/vocabulary';
import { SpeechManager } from '../utils/speech';

interface FlashcardModeProps {
  onClose: () => void;
}

const FlashcardMode: React.FC<FlashcardModeProps> = ({ onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [words, setWords] = useState<GermanWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [started, setStarted] = useState(false);
  const [stats, setStats] = useState({ correct: 0, incorrect: 0 });

  const startSession = () => {
    const selectedWords = selectedCategory === 'All'
      ? getRandomWords(20)
      : getRandomWordsByCategory(20, selectedCategory);
    setWords(selectedWords);
    setStarted(true);
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleRating = (known: boolean) => {
    if (known) {
      setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
    } else {
      setStats(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
    }

    setIsFlipped(false);

    setTimeout(() => {
      if (currentIndex + 1 < words.length) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setStarted(false);
      }
    }, 300);
  };

  if (!started) {
    const categories = ['All', ...getCategories()];
    
    return (
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">🃏 Flashcard Mode</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Review vocabulary with interactive flashcards
        </p>

        <div className="space-y-4 max-w-md mx-auto">
          <div>
            <label className="block text-lg font-bold mb-4">Select Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`py-2 px-3 text-sm font-bold rounded-lg transition-all ${
                    selectedCategory === category
                      ? 'bg-primary text-white scale-105'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={startSession}
          className="button-primary text-xl"
        >
          ▶ Start Flashcard Session
        </button>
      </div>
    );
  }

  if (currentIndex >= words.length) {
    return (
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">🎉 Session Complete!</h1>
        <div className="space-y-4">
          <div className="game-card p-6">
            <p className="text-lg">Total Cards: <span className="font-bold">{words.length}</span></p>
            <p className="text-lg">Known: <span className="font-bold text-green-600">{stats.correct}</span></p>
            <p className="text-lg">Need Practice: <span className="font-bold text-red-600">{stats.incorrect}</span></p>
            <p className="text-lg">Accuracy: <span className="font-bold">{Math.round((stats.correct / words.length) * 100)}%</span></p>
          </div>
        </div>
        <button onClick={onClose} className="button-primary">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  const progressPercent = ((currentIndex) / words.length) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">🃏 Flashcard Mode</h1>
          <p className="text-gray-600 dark:text-gray-400">Card {currentIndex + 1} of {words.length}</p>
        </div>
        <button onClick={onClose} className="button-secondary">
          ✕ Close
        </button>
      </div>

      {/* Progress Bar */}
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
      </div>

      {/* Flashcard */}
      <div 
        className="relative w-full h-80 cursor-pointer perspective-1000"
        onClick={handleFlip}
      >
        <div 
          className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Front */}
          <div className="absolute w-full h-full backface-hidden">
            <div className="game-card h-full bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-8 rounded-lg border-2 border-blue-300 dark:border-blue-700 flex flex-col items-center justify-center">
              <p className="text-sm text-gray-500 dark:text-gray-500 mb-2">German</p>
              <h2 className="text-5xl font-bold text-blue-600 dark:text-blue-400 mb-4">{currentWord.german}</h2>
              {currentWord.article && (
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">{currentWord.article}</p>
              )}
              {currentWord.pronunciation && (
                <p className="text-lg text-gray-500 dark:text-gray-500 mb-4">{currentWord.pronunciation}</p>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  SpeechManager.speak(currentWord.german);
                }}
                className="button-secondary px-6 py-2"
                title="Listen to pronunciation"
              >
                🔊 Listen
              </button>
              <p className="text-sm text-gray-400 mt-4">Click to flip</p>
            </div>
          </div>

          {/* Back */}
          <div className="absolute w-full h-full backface-hidden rotate-y-180">
            <div className="game-card h-full bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 p-8 rounded-lg border-2 border-green-300 dark:border-green-700 flex flex-col items-center justify-center">
              <p className="text-sm text-gray-500 dark:text-gray-500 mb-2">English</p>
              <h2 className="text-5xl font-bold text-green-600 dark:text-green-400 mb-4">{currentWord.english}</h2>
              {currentWord.category && (
                <p className="text-lg text-gray-600 dark:text-gray-400">Category: {currentWord.category}</p>
              )}
              <p className="text-sm text-gray-400 mt-4">Click to flip back</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rating Buttons */}
      {isFlipped && (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRating(false);
            }}
            className="button-secondary py-4 text-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50"
          >
            ❌ Need Practice
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRating(true);
            }}
            className="button-primary py-4 text-lg"
          >
            ✓ I Know This
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="game-card p-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">Known</p>
          <p className="text-2xl font-bold text-green-600">{stats.correct}</p>
        </div>
        <div className="game-card p-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">Need Practice</p>
          <p className="text-2xl font-bold text-red-600">{stats.incorrect}</p>
        </div>
      </div>
    </div>
  );
};

export default FlashcardMode;
