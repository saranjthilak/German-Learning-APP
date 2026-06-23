import React, { useEffect, useState } from 'react';

const COLORS = [
  '#facc15', '#f97316', '#22c55e', '#3b82f6',
  '#a855f7', '#ec4899', '#ef4444', '#06b6d4',
];

const Confetti: React.FC<{ onDone?: () => void }> = ({ onDone }) => {
  const [particles] = useState(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 6 + Math.random() * 8,
      duration: 2 + Math.random() * 2,
      delay: Math.random() * 0.8,
      rotation: Math.random() * 360,
      isCircle: Math.random() > 0.5,
    }))
  );

  useEffect(() => {
    const t = setTimeout(() => onDone?.(), 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            top: -20,
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            borderRadius: p.isCircle ? '50%' : '2px',
            background: p.color,
            transform: `rotate(${p.rotation}deg)`,
            animation: `confetti-fall ${p.duration}s ${p.delay}s ease-in forwards`,
          }}
        />
      ))}

      {/* Central burst text */}
      <div style={{
        position: 'absolute',
        top: '35%',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '3rem',
        fontFamily: 'Nunito, sans-serif',
        fontWeight: 900,
        color: '#facc15',
        textShadow: '0 0 30px rgba(250,204,21,0.6)',
        animation: 'fade-in-scale 0.4s ease-out both, xp-pop 2s 0.2s ease-out forwards',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}>
        🎉 Excellent!
      </div>
    </div>
  );
};

export default Confetti;
