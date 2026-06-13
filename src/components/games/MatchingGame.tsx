import React, { useState, useEffect } from 'react';
import { StorageManager } from '../../utils/storage';
import { GermanWord, getRandomWords, getRandomWordsByCategory, getCategories } from '../../data/vocabulary';

interface MatchingGameProps {
  onComplete: (xpEarned: number, accuracy: number, correctAnswers: number, totalAnswers: number) => void;
}

const MatchingGame: React.FC<MatchingGameProps> = ({ onComplete }) => {
  const [wordsCount, setWordsCount] = useState(10);
  const [selectedCategory, setSelectedCategory] = useState<string>('Level A1');
  const [gameStarted, setGameStarted] = useState(false);
  const [words, setWords] = useState<GermanWord[]>([]);
  const [englishWords, setEnglishWords] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<{ german?: string; english?: string }>({});
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'incorrect'; message: string } | null>(null);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [gameTime, setGameTime] = useState(0);

  useEffect(() => {
    if (!gameStarted) return;

    const timer = setInterval(() => setGameTime(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, [gameStarted]);

  const startGame = () => {
    const selectedWords = selectedCategory === 'All' 
      ? getRandomWords(wordsCount)
      : getRandomWordsByCategory(wordsCount, selectedCategory);
    setWords(selectedWords);
    setEnglishWords(selectedWords.map(w => w.english).sort(() => Math.random() - 0.5));
    setGameStarted(true);
  };

  const handleSelectGerman = (germanWord: string) => {
    setSelected(prev => ({
      ...prev,
      german: prev.german === germanWord ? undefined : germanWord,
    }));
  };

  const handleSelectEnglish = (englishWord: string) => {
    setSelected(prev => ({
      ...prev,
      english: prev.english === englishWord ? undefined : englishWord,
    }));
  };

  useEffect(() => {
    if (selected.german && selected.english && !feedback) {
      handleMatch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.german, selected.english]);

  const handleMatch = () => {
    if (!selected.german || !selected.english) return;

    const germanWord = words.find(w => w.german === selected.german);
    setTotalAttempts(prev => prev + 1);

    if (germanWord?.english !== selected.english) {
      StorageManager.addWeakWord(germanWord!.id, false);
    }

    if (germanWord?.english !== selected.english) {
      StorageManager.addWeakWord(germanWord!.id, false);
    }

    if (germanWord?.english === selected.english) {
      setMatched(prev => new Set([...prev, selected.german!]));
      setScore(prev => prev + 10);
      setCorrectAnswers(prev => prev + 1);
      setFeedback({ type: 'correct', message: '✓ Correct!' });

      setTimeout(() => {
        setFeedback(null);
        setSelected({});

        // Check if game is complete
        if (matched.size + 1 === wordsCount) {
          setTimeout(() => completeGame(), 500);
        }
      }, 1000);
    } else {
      StorageManager.addWeakWord(germanWord!.id, false);
      setScore(prev => Math.max(0, prev - 2));
      setFeedback({ type: 'incorrect', message: '✗ Try Again!' });

      setTimeout(() => {
        setFeedback(null);
        setSelected({});
      }, 1000);
    }
  };

  const completeGame = () => {
    const accuracy = Math.round((correctAnswers / totalAttempts) * 100);
    const xpEarned = Math.round((correctAnswers / wordsCount) * 50);
    onComplete(xpEarned, accuracy, correctAnswers, totalAttempts);
  };

  if (!gameStarted) {
    const categories = getCategories();
    
    return (
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">🎯 Matching Game</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Match German words with their English translations by dragging
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
            <label className="block text-lg font-bold mb-4">Select difficulty (words count)</label>
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
          ▶ Start Game
        </button>
      </div>
    );
  }

  const progressPercent = (matched.size / wordsCount) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">🎯 Matching Game</h1>
          <p className="text-gray-600 dark:text-gray-400">Match {matched.size} of {wordsCount}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary">{score} pts</p>
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

      {/* Game Board */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* German Words */}
        <div>
          <h3 className="text-lg font-bold mb-4">German Words</h3>
          <div className="space-y-2">
            {words.map((word) => (
              <button
                key={word.id}
                onClick={() => handleSelectGerman(word.german)}
                disabled={matched.has(word.german)}
                className={`w-full p-4 rounded-lg font-bold transition-all ${
                  matched.has(word.german)
                    ? 'bg-green-200 dark:bg-green-900 opacity-50 cursor-not-allowed'
                    : selected.german === word.german
                    ? 'bg-primary text-white scale-105'
                    : 'bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800'
                }`}
              >
                {word.german}
                {matched.has(word.german) && ' ✓'}
              </button>
            ))}
          </div>
        </div>

        {/* English Words */}
        <div>
          <h3 className="text-lg font-bold mb-4">English Translations</h3>
          <div className="space-y-2">
            {englishWords.map((english, index) => {
              const isMatched = Array.from(matched).some(
                germanWord => words.find(w => w.german === germanWord)?.english === english
              );

              return (
                <button
                  key={index}
                  onClick={() => handleSelectEnglish(english)}
                  disabled={isMatched}
                  className={`w-full p-4 rounded-lg font-bold transition-all ${
                    isMatched
                      ? 'bg-green-200 dark:bg-green-900 opacity-50 cursor-not-allowed'
                      : selected.english === english
                      ? 'bg-primary text-white scale-105'
                      : 'bg-orange-100 dark:bg-orange-900 hover:bg-orange-200 dark:hover:bg-orange-800'
                  }`}
                >
                  {english}
                  {isMatched && ' ✓'}
                </button>
              );
            })}
          </div>
        </div>
      </div>


    </div>
  );
};

export default MatchingGame;
