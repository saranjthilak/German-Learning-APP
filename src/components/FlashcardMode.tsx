import React, { useState } from 'react';
import { GermanWord, getCategories, getRandomWords, getRandomWordsByCategory } from '../data/vocabulary';
import { SpeechManager } from '../utils/speech';

interface FlashcardModeProps {
  onClose: () => void;
}

const getExampleSentence = (word: GermanWord) => {
  const isNoun = !!word.article;
  if (isNoun) {
    const art = word.article ? word.article + ' ' : '';
    return {
      german: `Das ist ${art}${word.german}.`,
      english: `That is the ${word.english.toLowerCase()}.`
    };
  }
  return {
    german: `Ich sage: ${word.german}.`,
    english: `I say: ${word.english.toLowerCase()}.`
  };
};

const FlashcardMode: React.FC<FlashcardModeProps> = ({ onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Level A1');
  const [words, setWords] = useState<GermanWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [started, setStarted] = useState(false);
  const [stats, setStats] = useState({ correct: 0, incorrect: 0 });
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [mastered, setMastered] = useState<Record<string, boolean>>({});

  const startSession = () => {
    const selectedWords = selectedCategory === 'All'
      ? getRandomWords(20)
      : getRandomWordsByCategory(20, selectedCategory);
    setWords(selectedWords);
    setStarted(true);
    setCurrentIndex(0);
    setIsFlipped(false);
    setStats({ correct: 0, incorrect: 0 });
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

  const toggleFavorite = (wordId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => ({ ...prev, [wordId]: !prev[wordId] }));
  };

  const toggleMastery = (wordId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMastered(prev => ({ ...prev, [wordId]: !prev[wordId] }));
  };

  if (!started) {
    const categories = getCategories();
    
    return (
      <div className="text-center space-y-6 animate-slide-up max-w-xl mx-auto p-4">
        <div className="text-5xl">🃏</div>
        <h1 className="text-3xl font-black">Flashcard Mode</h1>
        <p className="text-sm opacity-60">
          Review A1/A2 vocabulary with premium interactive flipping cards
        </p>

        <div className="space-y-4 bg-white/5 border border-white/10 p-5 rounded-3xl text-left">
          <label className="block text-sm font-black opacity-60 mb-2">Select Category</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`py-2 px-3 text-xs font-bold rounded-xl transition-all ${
                  selectedCategory === category
                    ? 'bg-purple-600 text-white scale-105 shadow-lg shadow-purple-500/30'
                    : 'bg-white/5 border border-white/5 hover:bg-white/10 text-slate-700 dark:text-slate-300'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={startSession}
          className="glow-btn glow-btn-purple w-full py-4 rounded-2xl font-black text-sm"
        >
          ▶ Start Flashcards
        </button>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  const progressPercent = ((currentIndex) / words.length) * 100;
  const example = currentWord ? getExampleSentence(currentWord) : { german: '', english: '' };

  return (
    <div className="space-y-6 max-w-xl mx-auto p-4 animate-slide-up">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black">🃏 Flashcards</h1>
          <p className="text-xs opacity-60">Card {currentIndex + 1} of {words.length}</p>
        </div>
        <button onClick={onClose} className="button-secondary text-xs px-4 py-2 rounded-xl">
          ✕ Close
        </button>
      </div>

      {/* Progress Bar */}
      <div className="progress-track">
        <div className="progress-fill-animated" style={{ width: `${progressPercent}%`, background: 'var(--color-purple)' }}></div>
      </div>

      {/* Flashcard */}
      <div 
        className="relative w-full h-96 cursor-pointer"
        style={{ perspective: '1000px' }}
        onClick={handleFlip}
      >
        <div 
          className="relative w-full h-full transition-transform duration-500"
          style={{ 
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
          }}
        >
          {/* Front */}
          <div 
            className="absolute w-full h-full"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            <div className="h-full bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-500/20 p-6 rounded-3xl flex flex-col justify-between shadow-xl"
              style={{ background: 'var(--color-surface)' }}>
              {/* Card Actions */}
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black opacity-40 uppercase tracking-widest">German</span>
                <div className="flex gap-2">
                  <button 
                    onClick={(e) => toggleMastery(currentWord.id, e)}
                    className={`p-2 rounded-xl text-sm transition-all border ${
                      mastered[currentWord.id] 
                        ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-500' 
                        : 'bg-white/5 border-white/5 opacity-40 hover:opacity-100'
                    }`}
                    title="Mark as Mastered"
                  >
                    🏆
                  </button>
                  <button 
                    onClick={(e) => toggleFavorite(currentWord.id, e)}
                    className={`p-2 rounded-xl text-sm transition-all border ${
                      favorites[currentWord.id] 
                        ? 'bg-red-500/20 border-red-500/40 text-red-500' 
                        : 'bg-white/5 border-white/5 opacity-40 hover:opacity-100'
                    }`}
                    title="Add to Favorites"
                  >
                    ❤️
                  </button>
                </div>
              </div>

              {/* Main Content */}
              <div className="text-center space-y-3">
                {currentWord.article && (
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-500/10 text-blue-500 border border-blue-500/20">
                    {currentWord.article}
                  </span>
                )}
                <h2 className="text-4xl font-extrabold text-indigo-500">{currentWord.german}</h2>
                {currentWord.pronunciation && (
                  <p className="text-sm opacity-50 italic">[{currentWord.pronunciation}]</p>
                )}
              </div>

              {/* Example & Audio */}
              <div className="flex flex-col items-center gap-3">
                <div className="text-xs opacity-65 text-center px-4">
                  <p className="font-bold text-slate-700 dark:text-slate-300">"{example.german}"</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    SpeechManager.speak(currentWord.german);
                  }}
                  className="w-10 h-10 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-500 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                  title="Listen pronunciation"
                >
                  🔊
                </button>
              </div>
            </div>
          </div>

          {/* Back */}
          <div 
            className="absolute w-full h-full"
            style={{ 
              backfaceVisibility: 'hidden', 
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)' 
            }}
          >
            <div className="h-full bg-gradient-to-br from-green-500/5 to-teal-500/5 border border-green-500/20 p-6 rounded-3xl flex flex-col justify-between shadow-xl"
              style={{ background: 'var(--color-surface)' }}>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black opacity-40 uppercase tracking-widest">English</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-500 border border-green-500/20">
                  {currentWord.category}
                </span>
              </div>

              {/* Main Content */}
              <div className="text-center space-y-2">
                <h2 className="text-4xl font-extrabold text-green-500">{currentWord.english}</h2>
                <p className="text-xs opacity-50">Translation</p>
              </div>

              {/* Translation Example */}
              <div className="text-center px-4 pb-4">
                <p className="text-xs opacity-50 mb-1">Example Translation</p>
                <p className="text-xs font-bold opacity-75">"{example.english}"</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Rating Buttons */}
      {isFlipped && (
        <div className="grid grid-cols-2 gap-3 animate-slide-up">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRating(false);
            }}
            className="py-3.5 rounded-2xl text-xs font-black border-2 border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 transition-all active:scale-95"
          >
            ❌ Need Practice
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRating(true);
            }}
            className="py-3.5 rounded-2xl text-xs font-black bg-green-500 text-white shadow-lg shadow-green-500/30 hover:bg-green-600 transition-all active:scale-95"
          >
            ✓ I Know This
          </button>
        </div>
      )}

      {/* Stats footer */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-500/5 border border-green-500/10 p-3 rounded-2xl text-center">
          <p className="text-[10px] opacity-50 font-bold uppercase tracking-wider">Known</p>
          <p className="text-xl font-black text-green-500">{stats.correct}</p>
        </div>
        <div className="bg-red-500/5 border border-red-500/10 p-3 rounded-2xl text-center">
          <p className="text-[10px] opacity-50 font-bold uppercase tracking-wider">Review</p>
          <p className="text-xl font-black text-red-500">{stats.incorrect}</p>
        </div>
      </div>
    </div>
  );
};

export default FlashcardMode;
