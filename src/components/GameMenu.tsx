import React from 'react';

interface GameMenuProps {
  onSelectGame: (game: 'matching' | 'memory' | 'quiz' | 'typing' | 'pronunciation') => void;
}

const GameMenu: React.FC<GameMenuProps> = ({ onSelectGame }) => {
  const games = [
    {
      id: 'matching',
      name: 'Matching Game',
      description: 'Drag and drop to match German words with English translations',
      icon: '🎯',
      color: 'from-blue-500 to-blue-600',
    },
    {
      id: 'memory',
      name: 'Memory Game',
      description: 'Flip cards and find matching pairs',
      icon: '🧠',
      color: 'from-purple-500 to-purple-600',
    },
    {
      id: 'quiz',
      name: 'Quiz',
      description: 'Multiple choice questions to test your knowledge',
      icon: '❓',
      color: 'from-green-500 to-green-600',
    },
    {
      id: 'typing',
      name: 'Typing Challenge',
      description: 'Type the German word for the English translation',
      icon: '⌨️',
      color: 'from-orange-500 to-orange-600',
    },
    {
      id: 'pronunciation',
      name: 'Pronunciation',
      description: 'Practice speaking and listen to native pronunciation',
      icon: '🔊',
      color: 'from-red-500 to-red-600',
    },
  ];

  return (
    <div className="py-8">
      <h2 className="text-4xl font-bold mb-8 text-center">🎮 Choose a Game</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {games.map((game) => (
          <button
            key={game.id}
            onClick={() => onSelectGame(game.id as any)}
            className={`game-card bg-gradient-to-br ${game.color} text-white p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 transform`}
          >
            <div className="text-5xl mb-4">{game.icon}</div>
            <h3 className="text-xl font-bold mb-2">{game.name}</h3>
            <p className="text-sm opacity-90">{game.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default GameMenu;
