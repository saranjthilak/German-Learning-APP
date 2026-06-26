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

    // Auto-advance to the next question or complete game after 1 second
    setTimeout(() => {
      if (currentQuestion + 1 < questions.length) {
        setCurrentQuestion(prev => prev + 1);
        setSelectedAnswer(null);
        setShowResult(false);
      } else {
        setCorrectAnswers(latestCorrect => {
          const accuracy = Math.round((latestCorrect / wordsCount) * 100);
          const xpEarned = Math.round((latestCorrect / wordsCount) * 50) + (accuracy > 80 ? 20 : 0);
          onComplete(xpEarned, accuracy, latestCorrect, wordsCount);
          return latestCorrect;
        });
      }
    }, 1000);
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
    <div className="space-y-6 max-w-xl mx-auto p-4 animate-slide-up">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black">❓ Quiz</h1>
          <p className="text-xs opacity-60">Question {currentQuestion + 1} of {wordsCount}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-black text-purple-600 dark:text-purple-400">{correctAnswers}/{currentQuestion}</p>
          <p className="text-xs opacity-60 font-bold">{gameTime}s</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-track">
        <div className="progress-fill-animated" style={{ width: `${progressPercent}%`, background: 'var(--color-purple)' }}></div>
      </div>

      {/* Question Card */}
      <div className="game-card p-6 border border-purple-500/10 shadow-lg text-center"
        style={{ background: 'var(--color-surface)' }}>
        <h2 className="text-3xl font-extrabold mb-1">{question.word.german}</h2>
        <p className="text-xs opacity-50">Select the correct English translation</p>
      </div>

      {/* Encouragement message */}
      {showResult && (
        <div className="text-center py-1 animate-float text-xs font-black text-purple-500">
          {selectedAnswer === question.correct ? '🎉 Super! Correct Answer!' : '💪 Keep learning, you can do it!'}
        </div>
      )}

      {/* Answer Options */}
      <div className="space-y-3">
        {question.options.map((option, index) => {
          const isCorrect = index === question.correct;
          const isSelected = selectedAnswer === index;
          const showCorrect = showResult && isCorrect;
          const showIncorrect = showResult && isSelected && !isCorrect;
          
          const bgClass = showCorrect
            ? 'bg-green-500 text-white shadow-lg shadow-green-500/25 border-green-600'
            : showIncorrect
            ? 'bg-red-500 text-white shadow-lg shadow-red-500/25 border-red-600'
            : isSelected
            ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25 border-purple-600'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700';

          return (
            <button
              key={index}
              onClick={() => handleAnswer(index)}
              disabled={showResult}
              style={{
                borderRadius: 20,
                borderWidth: '1.5px',
                borderStyle: 'solid',
              }}
              className={`w-full p-4 font-black text-left flex items-center justify-between tactile-btn ${bgClass} ${showResult && 'cursor-not-allowed'}`}
            >
              <div className="flex items-center">
                <span className="mr-4 px-2 py-1 bg-black/10 dark:bg-white/10 rounded-lg text-xs font-black">
                  {String.fromCharCode(65 + index)}
                </span>
                {option}
              </div>
              <div className="font-extrabold">
                {showCorrect && ' ✓'}
                {showIncorrect && ' ✗'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Pronunciation */}
      {question && (
        <div className="p-4 bg-blue-500/5 dark:bg-blue-500/10 rounded-2xl border border-blue-500/15">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            <span className="font-black text-blue-500">Pronunciation: </span>
            {question.word.pronunciation}
          </p>
        </div>
      )}
    </div>
  );
};

export default QuizGame;
