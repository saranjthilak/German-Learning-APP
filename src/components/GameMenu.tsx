import React, { useState } from 'react';

interface GameMenuProps {
  onSelectGame: (game: 'matching' | 'memory' | 'quiz' | 'typing' | 'pronunciation' | 'voice-tutor') => void;
}

const games = [
  {
    id: 'matching',
    name: 'Matching Game',
    description: 'Match German words to English translations',
    icon: '🎯',
    xp: '+40 XP',
    difficulty: 2,
    gradient: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
    glow: 'rgba(59,130,246,0.45)',
    border: 'rgba(59,130,246,0.3)',
  },
  {
    id: 'memory',
    name: 'Memory Game',
    description: 'Flip cards to find matching pairs',
    icon: '🧠',
    xp: '+50 XP',
    difficulty: 3,
    gradient: 'linear-gradient(135deg, #6d28d9, #a855f7)',
    glow: 'rgba(168,85,247,0.45)',
    border: 'rgba(168,85,247,0.3)',
  },
  {
    id: 'quiz',
    name: 'Quiz',
    description: 'Multiple-choice knowledge test',
    icon: '❓',
    xp: '+45 XP',
    difficulty: 2,
    gradient: 'linear-gradient(135deg, #065f46, #22c55e)',
    glow: 'rgba(34,197,94,0.45)',
    border: 'rgba(34,197,94,0.3)',
  },
  {
    id: 'typing',
    name: 'Typing Challenge',
    description: 'Type the German word from memory',
    icon: '⌨️',
    xp: '+60 XP',
    difficulty: 4,
    gradient: 'linear-gradient(135deg, #9a3412, #f97316)',
    glow: 'rgba(249,115,22,0.45)',
    border: 'rgba(249,115,22,0.3)',
  },
  {
    id: 'pronunciation',
    name: 'Pronunciation',
    description: 'Listen and speak like a native',
    icon: '🔊',
    xp: '+55 XP',
    difficulty: 3,
    gradient: 'linear-gradient(135deg, #9f1239, #ec4899)',
    glow: 'rgba(236,72,153,0.45)',
    border: 'rgba(236,72,153,0.3)',
  },
];

const DifficultyStars: React.FC<{ count: number }> = ({ count }) => (
  <div style={{ display: 'flex', gap: 2 }}>
    {[1, 2, 3, 4, 5].map(i => (
      <span key={i} style={{ fontSize: 10, opacity: i <= count ? 1 : 0.2 }}>★</span>
    ))}
  </div>
);

const GameMenu: React.FC<GameMenuProps> = ({ onSelectGame }) => {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div style={{ paddingTop: 8 }}>
      {/* Section header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 6 }}>🎮 Choose Your Game</h2>
        <p style={{ fontSize: 14, opacity: 0.45 }}>Each game earns XP — play daily to keep your streak!</p>
      </div>


      {/* Game Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}
        className="sm:grid-cols-3 lg:grid-cols-5">
        {games.map((game) => (
          <button
            key={game.id}
            id={`game-${game.id}`}
            onClick={() => onSelectGame(game.id as any)}
            onMouseEnter={() => setHovered(game.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              background: game.gradient,
              border: `1.5px solid ${hovered === game.id ? game.border : 'transparent'}`,
              borderRadius: 24,
              padding: '24px 16px',
              color: 'white',
              cursor: 'pointer',
              textAlign: 'center',
              boxShadow: hovered === game.id
                ? `0 12px 32px ${game.glow}`
                : '0 4px 20px rgba(0,0,0,0.15)',
              position: 'relative',
              overflow: 'hidden',
            }}
            className="tactile-btn"
          >
            {/* XP badge */}
            <div style={{
              position: 'absolute', top: 10, right: 10,
              fontSize: 10, fontWeight: 900,
              padding: '2px 7px', borderRadius: 999,
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
            }}>
              {game.xp}
            </div>

            <div style={{ fontSize: 44, marginBottom: 10, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }}>
              {game.icon}
            </div>
            <h3 style={{ fontSize: 14, fontWeight: 900, marginBottom: 6, lineHeight: 1.2 }}>
              {game.name}
            </h3>
            <p style={{ fontSize: 11, opacity: 0.75, marginBottom: 10, lineHeight: 1.4 }}>
              {game.description}
            </p>
            <DifficultyStars count={game.difficulty} />
          </button>
        ))}
      </div>

      {/* Bottom tip */}
      <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, opacity: 0.3 }}>
        💡 Tip: Play every day to maintain your streak and earn bonus XP
      </div>
    </div>
  );
};

export default GameMenu;
