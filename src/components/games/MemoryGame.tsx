import React, { useState, useEffect } from 'react';
import { germanVocabulary, getRandomWords, GermanWord } from '../../data/vocabulary';

interface MemoryGameProps {
  onComplete: (xpEarned: number, accuracy: number, correctAnswers: number, totalAnswers: number) => void;
}

interface Card {
  id: string;
  type: 'german' | 'english';
  content: string;
  wordId: string;
  flipped: boolean;
  matched: boolean;
}

const MemoryGame: React.FC<MemoryGameProps> = ({ onComplete }) => {
  const [wordsCount, setWordsCount] = useState(10);
  const [gameStarted, setGameStarted] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [gameTime, setGameTime] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [correctMatches, setCorrectMatches] = useState(0);

  useEffect(() => {
    if (!gameStarted) return;
    const timer = setInterval(() => setGameTime(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, [gameStarted]);

  const startGame = () => {
    const selectedWords = getRandomWords(wordsCount);
    const gameCards: Card[] = [];

    selectedWords.forEach((word, index) => {
      gameCards.push({
        id: `german-${index}`,
        type: 'german',
        content: word.german,
        wordId: word.id,
        flipped: false,
        matched: false,
      });

      gameCards.push({
        id: `english-${index}`,
        type: 'english',
        content: word.english,
        wordId: word.id,
        flipped: false,
        matched: false,
      });
    });

    // Shuffle cards
    gameCards.sort(() => Math.random() - 0.5);
    setCards(gameCards);
    setGameStarted(true);
  };

  const handleCardClick = (index: number) => {
    if (flipped.has(index) || matched.has(index) || isChecking || flipped.size >= 2) {
      return;
    }

    const newFlipped = new Set(flipped);
    newFlipped.add(index);
    setFlipped(newFlipped);

    if (newFlipped.size === 2) {
      setMoves(prev => prev + 1);
      checkMatch(Array.from(newFlipped));
    }
  };

  const checkMatch = (indices: number[]) => {
    setIsChecking(true);
    const card1 = cards[indices[0]];
    const card2 = cards[indices[1]];

    setTimeout(() => {
      if (card1.wordId === card2.wordId) {
        // Match found
        setMatched(prev => new Set([...prev, ...indices]));
        setCorrectMatches(prev => prev + 1);

        if (matched.size + 2 === cards.length) {
          setTimeout(() => completeGame(), 500);
        }
      }

      setFlipped(new Set());
      setIsChecking(false);
    }, 1000);
  };

  const completeGame = () => {
    const accuracy = Math.round((correctMatches / (moves)) * 100);
    const xpEarned = Math.round((correctMatches / wordsCount) * 60);
    onComplete(xpEarned, accuracy, correctMatches, moves);
  };

  if (!gameStarted) {
    return (
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">🧠 Memory Game</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Flip cards and match German words with English translations
        </p>

        <div className="space-y-4 max-w-md mx-auto">
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

  const progressPercent = (matched.size / cards.length) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">🧠 Memory Game</h1>
          <p className="text-gray-600 dark:text-gray-400">Matches: {matched.size / 2} of {wordsCount}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary">Moves: {moves}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{gameTime}s</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
      </div>

      {/* Game Board */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
        {cards.map((card, index) => {
          const isFlipped = flipped.has(index) || matched.has(index);
          const isMatched = matched.has(index);

          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(index)}
              disabled={isMatched || isChecking}
              className={`aspect-square rounded-lg font-bold text-sm sm:text-base transition-all transform ${
                isMatched
                  ? 'bg-green-200 dark:bg-green-900 opacity-50 cursor-not-allowed'
                  : isFlipped
                  ? 'bg-primary text-white scale-105'
                  : 'bg-blue-300 dark:bg-blue-700 hover:scale-105 cursor-pointer'
              }`}
            >
              {isFlipped ? (
                <span className={card.type === 'german' ? 'text-sm' : 'text-xs'}>
                  {card.content}
                </span>
              ) : (
                '?'
              )}
            </button>
          );
        })}
      </div>

      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        {matched.size === cards.length ? (
          <p className="text-lg font-bold text-green-600 dark:text-green-400">
            ✓ You won! Great memory!
          </p>
        ) : (
          <p>Find all matching pairs!</p>
        )}
      </div>
    </div>
  );
};

export default MemoryGame;
