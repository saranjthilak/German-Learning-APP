import React, { useState, useEffect } from 'react';
import { StorageManager } from '../../utils/storage';
import { getRandomWords, getRandomWordsByCategory, getCategories, GermanWord, germanVocabulary } from '../../data/vocabulary';

interface QuizGameProps {
  onComplete: (xpEarned: number, accuracy: number, correctAnswers: number, totalAnswers: number) => void;
}

interface Question {
  word: GermanWord;
  options: string[];
  correct: number;
}

const QuizGame: React.FC<QuizGameProps> = ({ onComplete }) => {
  const [wordsCount, setWordsCount] = useState(10);
  const [selectedCategory, setSelectedCategory] = useState<string>('Level A1');
  const [gameStarted, setGameStarted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
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
    const gameQuestions: Question[] = selectedWords.map((word) => {
      const correctOption = word.english;
      const incorrectOptions = germanVocabulary
        .filter(w => w.id !== word.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(w => w.english);

      const options = [correctOption, ...incorrectOptions].sort(() => Math.random() - 0.5);
      const correctIndex = options.indexOf(correctOption);

      return {
        word,
        options,
        correct: correctIndex,
      };
    });

    setQuestions(gameQuestions);
    setGameStarted(true);
  };

  const handleAnswer = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
    setShowResult(true);

    const isCorrect = index === questions[currentQuestion].correct;
    const wordId = questions[currentQuestion].word.id;

    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
      StorageManager.markWordLearned(wordId);
      StorageManager.addWeakWord(wordId, true);
    } else {
      StorageManager.addWeakWord(wordId, false);
    }
  };

  const handleNext = () => {
    if (currentQuestion + 1 < questions.length) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      completeGame();
    }
  };

  const completeGame = () => {
    const accuracy = Math.round((correctAnswers / wordsCount) * 100);
    const xpEarned = Math.round((correctAnswers / wordsCount) * 50) + (accuracy > 80 ? 20 : 0);
    onComplete(xpEarned, accuracy, correctAnswers, wordsCount);
  };

  if (!gameStarted) {
    const categories = getCategories();
    
    return (
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">❓ Quiz Game</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Answer multiple choice questions about German vocabulary
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
            <label className="block text-lg font-bold mb-4">Select difficulty (number of questions)</label>
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
          ▶ Start Quiz
        </button>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const progressPercent = ((currentQuestion + 1) / wordsCount) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">❓ Quiz</h1>
          <p className="text-gray-600 dark:text-gray-400">Question {currentQuestion + 1} of {wordsCount}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary">{correctAnswers}/{currentQuestion}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{gameTime}s</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
      </div>

      {/* Question Card */}
      <div className="game-card bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-8 rounded-lg border-2 border-green-300 dark:border-green-700">
        <h2 className="text-3xl font-bold text-center mb-2">{question.word.german}</h2>
        <p className="text-center text-gray-600 dark:text-gray-400">What does this word mean?</p>
      </div>

      {/* Answer Options */}
      <div className="space-y-3">
        {question.options.map((option, index) => {
          const isCorrect = index === question.correct;
          const isSelected = selectedAnswer === index;
          const showCorrect = showResult && isCorrect;
          const showIncorrect = showResult && isSelected && !isCorrect;

          return (
            <button
              key={index}
              onClick={() => handleAnswer(index)}
              disabled={showResult}
              className={`w-full p-4 rounded-lg font-bold text-lg transition-all transform ${
                showCorrect
                  ? 'bg-green-200 dark:bg-green-900 border-2 border-green-500 scale-105'
                  : showIncorrect
                  ? 'bg-red-200 dark:bg-red-900 border-2 border-red-500 scale-105'
                  : isSelected
                  ? 'bg-blue-300 dark:bg-blue-700 border-2 border-blue-500 scale-105'
                  : 'bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 hover:scale-102'
              } ${showResult && 'cursor-not-allowed'}`}
            >
              <span className="mr-4 font-bold">
                {String.fromCharCode(65 + index)}.
              </span>
              {option}
              {showCorrect && ' ✓'}
              {showIncorrect && ' ✗'}
            </button>
          );
        })}
      </div>

      {/* Pronunciation */}
      {question && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-300 dark:border-blue-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-bold">Pronunciation: </span>
            {question.word.pronunciation}
          </p>
        </div>
      )}

      {/* Next Button */}
      {showResult && (
        <button
          onClick={handleNext}
          className="button-primary w-full text-lg"
        >
          {currentQuestion + 1 === wordsCount ? 'Complete Quiz' : 'Next Question'} →
        </button>
      )}
    </div>
  );
};

export default QuizGame;
