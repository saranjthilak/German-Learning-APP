import React, { useState, useEffect } from 'react';
import { getRandomWords, getRandomWordsByCategory, getCategories, GermanWord } from '../../data/vocabulary';
import { SpeechManager } from '../../utils/speech';

interface PronunciationGameProps {
  onComplete: (xpEarned: number, accuracy: number, correctAnswers: number, totalAnswers: number) => void;
}

const PronunciationGame: React.FC<PronunciationGameProps> = ({ onComplete }) => {
  const [wordsCount, setWordsCount] = useState(10);
  const [selectedCategory, setSelectedCategory] = useState<string>('Level A1');
  const [gameStarted, setGameStarted] = useState(false);
  const [words, setWords] = useState<GermanWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'close' | 'incorrect'; message: string } | null>(null);
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
    setGameStarted(true);
  };

  const handleListen = () => {
    setIsListening(true);
    setTranscript('');
    setSimilarity(null);

    SpeechManager.listen(
      (result) => {
        setTranscript(result);
        const currentWord = words[currentIndex];
        const sim = SpeechManager.calculateSimilarity(result, currentWord.german);
        setSimilarity(sim);

        if (sim >= 80) {
          setCorrectAnswers(prev => prev + 1);
          setFeedback({ type: 'correct', message: '✓ Excellent pronunciation!' });
        } else if (sim >= 60) {
          setFeedback({ type: 'close', message: '~ Close! Try again' });
        } else {
          setFeedback({ type: 'incorrect', message: '✗ Not quite right' });
        }

        setIsListening(false);

        if (sim >= 80) {
          setTimeout(() => {
            if (currentIndex + 1 < wordsCount) {
              setCurrentIndex(prev => prev + 1);
              setTranscript('');
              setSimilarity(null);
              setFeedback(null);
            } else {
              completeGame();
            }
          }, 2000);
        }
      },
      (error) => {
        setFeedback({ type: 'incorrect', message: `Error: ${error}` });
        setIsListening(false);
      }
    );
  };

  const handleSkip = () => {
    if (currentIndex + 1 < wordsCount) {
      setCurrentIndex(prev => prev + 1);
      setTranscript('');
      setSimilarity(null);
      setFeedback(null);
    } else {
      completeGame();
    }
  };

  const completeGame = () => {
    const accuracy = Math.round((correctAnswers / wordsCount) * 100);
    const xpEarned = Math.round((correctAnswers / wordsCount) * 60);
    onComplete(xpEarned, accuracy, correctAnswers, wordsCount);
  };

  if (!gameStarted) {
    const categories = getCategories();
    
    return (
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">🔊 Pronunciation Challenge</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Listen and speak German words. Your pronunciation will be evaluated!
        </p>
        <p className="text-sm text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
          Note: Make sure your microphone is enabled and working
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
          ▶ Start Pronunciation Challenge
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
          <h1 className="text-3xl font-bold">🔊 Pronunciation</h1>
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
            : feedback.type === 'close'
            ? 'bg-yellow-200 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
            : 'bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200'
        }`}>
          {feedback.message}
        </div>
      )}

      {/* Word Card */}
      <div className="game-card bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 p-8 rounded-lg border-2 border-red-300 dark:border-red-700">
        <p className="text-center text-gray-600 dark:text-gray-400 mb-4">Say this word:</p>
        <h2 className="text-5xl font-bold text-center text-red-600 dark:text-red-400 mb-6">
          {currentWord.german}
        </h2>
        <button
          onClick={() => SpeechManager.speak(currentWord.german)}
          className="mx-auto block button-primary"
        >
          🔊 Listen to Pronunciation
        </button>
      </div>

      {/* Pronunciation Guide */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-300 dark:border-blue-700">
        <p className="text-center">
          <span className="text-gray-600 dark:text-gray-400">Pronunciation: </span>
          <span className="font-bold text-lg">{currentWord.pronunciation}</span>
        </p>
      </div>

      {/* Recording Area */}
      <div className="space-y-4">
        <button
          onClick={handleListen}
          disabled={isListening}
          className={`w-full py-6 rounded-lg font-bold text-lg transition-all transform ${
            isListening
              ? 'bg-red-500 text-white animate-pulse scale-105'
              : 'button-primary'
          }`}
        >
          {isListening ? '🎤 Recording...' : '🎤 Click to Speak'}
        </button>

        {transcript && (
          <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">You said:</p>
            <p className="font-bold text-lg">{transcript}</p>
            {similarity !== null && (
              <div className="mt-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">Accuracy: {similarity}%</p>
                <div className="progress-bar mt-1">
                  <div
                    className={`progress-fill ${
                      similarity >= 80 ? 'bg-green-500' : similarity >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${similarity}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Skip Button */}
      {feedback && similarity && similarity < 80 && (
        <button
          onClick={handleSkip}
          className="button-secondary w-full"
        >
          → Next Word
        </button>
      )}
    </div>
  );
};

export default PronunciationGame;
