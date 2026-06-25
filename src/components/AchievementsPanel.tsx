import React from 'react';
import { UserData } from '../types';

interface AchievementsPanelProps {
  userData: UserData;
}

const AchievementsPanel: React.FC<AchievementsPanelProps> = ({ userData }) => {
  const unlockedCount = userData.achievements.filter(a => a.unlocked).length;

  return (
    <div className="game-card" style={{
      background: '#1a1a2e',
      border: '1px solid rgba(255,255,255,0.07)',
      padding: 16,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontWeight: 900, fontSize: 16, color: 'white' }}>🏆 All Achievements</h3>
        <span style={{ fontSize: 12, opacity: 0.6, fontWeight: 700 }}>
          {unlockedCount} / {userData.achievements.length} Unlocked
        </span>
      </div>

      {/* List */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 8, 
        maxHeight: 420, 
        overflowY: 'auto', 
        paddingRight: 4 
      }}>
        {userData.achievements.map((achievement) => (
          <div
            key={achievement.id}
            style={{
              padding: '8px 12px',
              borderRadius: 12,
              border: achievement.unlocked ? '1.5px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(255,255,255,0.06)',
              background: achievement.unlocked ? 'rgba(34, 197, 94, 0.08)' : 'rgba(255,255,255,0.03)',
              opacity: achievement.unlocked ? 1 : 0.6,
              transition: 'transform 0.15s',
            }}
            className="achievement-item-row"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 24, flexShrink: 0 }}>{achievement.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontWeight: 800, fontSize: 13, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {achievement.name}
                  </h4>
                  {achievement.unlocked && (
                    <span style={{ fontSize: 10, color: '#4ade80', fontWeight: 800 }}>✓ UNLOCKED</span>
                  )}
                </div>
                <p style={{ fontSize: 11, opacity: 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: '2px 0 0 0' }}>
                  {achievement.description}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, opacity: 0.5, marginTop: 2 }}>
                  <span>Progress: {achievement.currentProgress} / {achievement.requirement}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AchievementsPanel;
