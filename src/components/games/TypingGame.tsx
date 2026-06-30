import React, { useState, useEffect } from 'react';
import { getRandomWords, getRandomWordsByCategory, getCategories, GermanWord } from '../../data/vocabulary';
import { SpeechManager } from '../../utils/speech';
import { StorageManager } from '../../utils/storage';

interface TypingGameProps {
  onComplete: (xpEarned: number, accuracy: number, correctAnswers: number, totalAnswers: number) => void;
}

const TypingGame: React.FC<TypingGameProps> = ({ onComplete }) => {
  const [wordsCount, setWordsCount] = useState(10);
  const [selectedCategory, setSelectedCategory] = useState<string>('Level A1');
  const [gameStarted, setGameStarted] = useState(false);
  const [words, setWords] = useState<GermanWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState('');
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'incorrect'; message: string } | null>(null);
  const [gameTime, setGameTime] = useState(0);

  useEffect(() => {
    if (!gameStarted) return;
    const timer = setInterval(() => setGameTime(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, [gameStarted]);

  const startGame = () => {
    const learnedIds = StorageManager.getUserData().learnedWords || [];
    const selectedWords = selectedCategory === 'All' 
      ? getRandomWords(wordsCount, learnedIds)
      : getRandomWordsByCategory(wordsCount, selectedCategory, learnedIds);
    setWords(selectedWords);
    setGameStarted(true);
  };

  const handleSubmit = () => {
    if (!input.trim()) return;

    const currentWord = words[currentIndex];
    const isCorrect = SpeechManager.isCorrectSpelling(input, currentWord.german);

    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
      StorageManager.markWordLearned(currentWord.id);
      StorageManager.addWeakWord(currentWord.id, true);
      setStreak(prev => {
        const newStreak = prev + 1;
        if (newStreak > bestStreak) setBestStreak(newStreak);
        return newStreak;
      });
      setFeedback({ type: 'correct', message: '✓ Correct!' });
    } else {
      StorageManager.addWeakWord(currentWord.id, false);
      setStreak(0);
      setFeedback({ type: 'incorrect', message: `✗ Wrong! It's "${currentWord.german}"` });
    }

    setInput('');

    setTimeout(() => {
      if (currentIndex + 1 < wordsCount) {
        setCurrentIndex(prev => prev + 1);
        setFeedback(null);
      } else {
        completeGame();
      }
    }, 1500);
  };

  const completeGame = () => {
    const accuracy = Math.round((correctAnswers / wordsCount) * 100);
    const xpEarned = Math.round((correctAnswers / wordsCount) * 50) + (bestStreak * 5);
    onComplete(xpEarned, accuracy, correctAnswers, wordsCount);
  };

  if (!gameStarted) {
    const categories = getCategories();
    
    return (
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">⌨️ Typing Challenge</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Type the German word for the English translation shown
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

          <div>
            <label className="block text-lg font-bold mb-4">Select difficulty (number of words)</label>
            <div className="grid grid-cols-3 gap-4">
              {[10, 15, 20].map(count => (
                <button
                  key={count}
                  onClick={() => setWordsCount(count)}
                  className={`py-3 font-bold rounded-lg transition-all ${
                    wordsCount === count
                      ? 'bg-primary text-white scale-105'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={startGame}
          className="button-primary text-xl"
        >
          ▶ Start Typing Challenge
        </button>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  const progressPercent = ((currentIndex) / wordsCount) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">⌨️ Typing Challenge</h1>
          <p className="text-gray-600 dark:text-gray-400">Word {currentIndex + 1} of {wordsCount}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary">{correctAnswers}/{currentIndex}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{gameTime}s</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`p-4 rounded-lg text-center font-bold text-lg ${
          feedback.type === 'correct'
            ? 'bg-green-200 dark:bg-green-900 text-green-800 dark:text-green-200'
            : 'bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200'
        }`}>
          {feedback.message}
        </div>
      )}

      {/* Question Card */}
      <div className="glass-card p-8 rounded-lg border-2 border-orange-300 dark:border-orange-700">
        <p className="text-center text-gray-600 dark:text-gray-400 mb-4">Type the German word for:</p>
        <h2 className="text-4xl font-bold text-center text-orange-600 dark:text-orange-400">{currentWord.english}</h2>
      </div>

      {/* Input Area */}
      <div className="space-y-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Type your answer..."
          autoFocus
          className="glass-input"
        />

        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={!input.trim()}
            className="glow-btn-primary flex-1"
          >
            Check Answer
          </button>
          <button
            onClick={() => SpeechManager.speak(currentWord.german)}
            className="glow-btn-primary"
            title="Listen to pronunciation"
          >
            🔊
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-300 dark:border-blue-700 space-y-2">
        <p className="font-bold">
          <span className="text-orange-600 dark:text-orange-400">Current Streak: {streak} 🔥</span>
        </p>
      </div>
    </div>
  );
};

export default TypingGame;
