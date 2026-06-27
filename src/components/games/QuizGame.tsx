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

const getExampleSentence = (word: GermanWord): { de: string; en: string } => {
  const sentences: Record<string, { de: string; en: string }> = {
    g1: { de: "Hallo! Wie geht es dir?", en: "Hello! How are you?" },
    g2: { de: "Guten Morgen, mein Freund!", en: "Good morning, my friend!" },
    g3: { de: "Guten Tag, Herr Schmidt.", en: "Good day, Mr. Schmidt." },
    g12: { de: "Vielen Dank für das Geschenk.", en: "Thank you very much for the gift." },
    f2: { de: "Meine Mutter kocht sehr gut.", en: "My mother cooks very well." },
    f3: { de: "Mein Vater arbeitet im Büro.", en: "My father works in the office." },
    f6: { de: "Ich habe einen jüngeren Bruder.", en: "I have a younger brother." },
    f7: { de: "Meine Schwester lernt Deutsch.", en: "My sister is learning German." },
    fd2: { de: "Frisches Brot schmeckt lecker.", en: "Fresh bread tastes delicious." },
    fd5: { de: "Trinkst du Milch am Morgen?", en: "Do you drink milk in the morning?" },
    fd10: { de: "Ein Apfel am Tag hält den Arzt fern.", en: "An apple a day keeps the doctor away." },
    a1: { de: "Katzen schlafen gerne im Bett.", en: "Cats like to sleep in bed." },
    a2: { de: "Der Hund läuft im Garten.", en: "The dog runs in the garden." },
    c1: { de: "Rot ist meine Lieblingsfarbe.", en: "Red is my favorite color." },
    c2: { de: "Der Himmel ist heute blau.", en: "The sky is blue today." },
    n1: { de: "Ich habe eins Katze.", en: "I have one cat." },
    n2: { de: "Zwei Kaffee, bitte.", en: "Two coffees, please." },
  };
  
  if (sentences[word.id]) return sentences[word.id];
  
  if (word.category === 'Food') {
    return { 
      de: `Ich mag ${word.article ? `${word.article} ` : ''}${word.german}.`, 
      en: `I like the ${word.english.toLowerCase()}.` 
    };
  }
  if (word.category === 'Family') {
    return { 
      de: `Das ist mein ${word.german}.`, 
      en: `That is my ${word.english.toLowerCase()}.` 
    };
  }
  return { 
    de: `Wir lernen das Wort: ${word.german}.`, 
    en: `We are learning the word: ${word.english.toLowerCase()}.` 
  };
};

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

  const [liveFeedback, setLiveFeedback] = useState('');

  useEffect(() => {
    if (!gameStarted || showResult) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'a' || key === '1') {
        e.preventDefault();
        handleAnswer(0);
      } else if (key === 'b' || key === '2') {
        e.preventDefault();
        handleAnswer(1);
      } else if (key === 'c' || key === '3') {
        e.preventDefault();
        handleAnswer(2);
      } else if (key === 'd' || key === '4') {
        e.preventDefault();
        handleAnswer(3);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStarted, showResult, questions, currentQuestion]);

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
    setLiveFeedback('');
    setGameStarted(true);
  };

  const handleAnswer = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
    setShowResult(true);

    const isCorrect = index === questions[currentQuestion].correct;
    const currentWord = questions[currentQuestion].word;
    const feedbackMsg = isCorrect
      ? `Correct! ${currentWord.german} = ${currentWord.english}.`
      : `Incorrect. ${currentWord.german} = ${currentWord.english}. You chose ${questions[currentQuestion].options[index]}.`;
    setLiveFeedback(feedbackMsg);

    const wordId = currentWord.id;

    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
      StorageManager.markWordLearned(wordId);
      StorageManager.addWeakWord(wordId, true);
    } else {
      StorageManager.addWeakWord(wordId, false);
    }

    // Auto-advance to the next question or complete game after 1.5 seconds
    setTimeout(() => {
      if (currentQuestion + 1 < questions.length) {
        setCurrentQuestion(prev => prev + 1);
        setSelectedAnswer(null);
        setShowResult(false);
        setLiveFeedback('');
      } else {
        setCorrectAnswers(latestCorrect => {
          const accuracy = Math.round((latestCorrect / wordsCount) * 100);
          const xpEarned = Math.round((latestCorrect / wordsCount) * 50) + (accuracy > 80 ? 20 : 0);
          onComplete(xpEarned, accuracy, latestCorrect, wordsCount);
          return latestCorrect;
        });
      }
    }, 1500);
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

      {/* Rich Feedback Card */}
      {showResult && (
        <div className="animate-slide-up p-5 rounded-2xl border text-center space-y-2.5"
          style={{
            background: selectedAnswer === question.correct 
              ? 'rgba(34, 197, 94, 0.08)' 
              : 'rgba(239, 68, 68, 0.08)',
            borderColor: selectedAnswer === question.correct 
              ? 'rgba(34, 197, 94, 0.2)' 
              : 'rgba(239, 68, 68, 0.2)',
          }}>
          <div className="flex items-center justify-center gap-1.5">
            <span style={{ fontSize: 20 }}>
              {selectedAnswer === question.correct ? '🎉' : '💡'}
            </span>
            <h3 className={`text-sm font-black uppercase tracking-wider ${selectedAnswer === question.correct ? 'text-green-500' : 'text-red-500'}`}>
              {selectedAnswer === question.correct ? 'Correct!' : 'Incorrect'}
            </h3>
          </div>
          
          <div>
            <p className="text-2xl font-black text-white">
              {question.word.article ? <span className="opacity-55 font-bold mr-1">{question.word.article}</span> : ''}
              {question.word.german}
            </p>
            <p className="text-xs text-slate-400 font-bold mt-0.5">
              {question.word.english} · <span className="italic text-purple-400 font-medium">/{question.word.pronunciation}/</span>
            </p>
          </div>
          
          <div className="pt-2 border-t border-white/5 text-[11px] text-slate-300">
            <span className="font-extrabold text-slate-400 block mb-0.5">Example:</span>
            <p className="font-black text-white">"{getExampleSentence(question.word).de}"</p>
            <p className="text-slate-500">({getExampleSentence(question.word).en})</p>
          </div>
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
              role="button"
              aria-label={`Option ${String.fromCharCode(65 + index)}: ${option}`}
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

      {/* Visually hidden accessibility announcer */}
      <div
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: '0',
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: '0',
        }}
        aria-live="polite"
        aria-atomic="true"
      >
        {liveFeedback}
      </div>
    </div>
  );
};

export default QuizGame;
