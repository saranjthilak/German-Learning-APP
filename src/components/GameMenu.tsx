import React from 'react';

interface GameMenuProps {
  onSelectGame: (game: 'matching' | 'memory' | 'quiz' | 'typing' | 'pronunciation' | 'voice-tutor') => void;
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

      {/* AI Voice Tutor — featured card */}
      <div className="mb-6">
        <button
          id="game-voice-tutor"
          onClick={() => onSelectGame('voice-tutor')}
          className="w-full game-card p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
            color: 'white',
          }}
        >
          <div className="flex items-center gap-5">
            <div className="text-6xl">🎙️</div>
            <div className="text-left">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-2xl font-bold">AI Voice Tutor</h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.25)' }}>NEW</span>
              </div>
              <p className="text-sm opacity-90">
                Have a real spoken conversation in German with Lena, your AI tutor.
                Smart English help when you need it.
              </p>
            </div>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {games.map((game) => (
          <button
            key={game.id}
            id={`game-${game.id}`}
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
