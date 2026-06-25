import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserData } from '../types';

interface LeaderboardProps {
  userData: UserData;
  currentUid?: string;
}

interface LeaderEntry {
  uid: string;
  playerName: string;
  level: number;
  totalXP: number;
  accuracy: number;
  currentStreak: number;
}

const RANK_COLORS: Record<number, { bg: string; border: string; label: string }> = {
  0: { bg: 'linear-gradient(135deg,#92400e,#f59e0b)', border: 'rgba(251,191,36,0.5)', label: '🥇' },
  1: { bg: 'linear-gradient(135deg,#374151,#9ca3af)', border: 'rgba(156,163,175,0.5)', label: '🥈' },
  2: { bg: 'linear-gradient(135deg,#7c2d12,#c2410c)', border: 'rgba(249,115,22,0.4)', label: '🥉' },
};

const Leaderboard: React.FC<LeaderboardProps> = ({ userData, currentUid }) => {
  const [entries, setEntries]   = useState<LeaderEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  useEffect(() => {
    let cancelled = false;

    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);
      try {
        // Query top 10 users by totalXP from Firestore
        const q = query(
          collection(db, 'users'),
          orderBy('stats.totalXP', 'desc'),
          limit(10)
        );
        const snap = await getDocs(q);

        if (cancelled) return;

        const results: LeaderEntry[] = snap.docs.map(doc => {
          const d = doc.data() as any;
          return {
            uid: doc.id,
            playerName: d.playerName || 'Anonymous',
            level:         d.stats?.level         ?? 1,
            totalXP:       d.stats?.totalXP       ?? 0,
            accuracy:      d.stats?.accuracy      ?? 0,
            currentStreak: d.stats?.currentStreak ?? 0,
          };
        });

        if (!currentUid && userData.stats.totalXP > 0) {
          // Guest user — show at bottom with note
          results.push({
            uid: '__guest__',
            playerName: userData.playerName + ' (you · guest)',
            level: userData.stats.level,
            totalXP: userData.stats.totalXP,
            accuracy: userData.stats.accuracy,
            currentStreak: userData.stats.currentStreak,
          });
          results.sort((a, b) => b.totalXP - a.totalXP);
        }

        setEntries(results.slice(0, 10));
      } catch (err: any) {
        if (cancelled) return;
        // If index not ready or permissions issue, fall back to local-only
        setError('Could not load live leaderboard.');
        // Fallback: show current user alone
        setEntries([{
          uid: currentUid || '__guest__',
          playerName: userData.playerName,
          level: userData.stats.level,
          totalXP: userData.stats.totalXP,
          accuracy: userData.stats.accuracy,
          currentStreak: userData.stats.currentStreak,
        }]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchLeaderboard();
    return () => { cancelled = true; };
  }, [lastRefresh, currentUid]);

  const isMe = (entry: LeaderEntry) =>
    (currentUid && entry.uid === currentUid) ||
    (!currentUid && entry.uid === '__guest__');

  return (
    <div className="game-card" style={{
      background: '#1a1a2e',
      border: '1px solid rgba(255,255,255,0.07)',
      padding: 16,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontWeight: 900, fontSize: 16 }}>🏆 Global Leaderboard</h3>
        <button
          onClick={() => setLastRefresh(Date.now())}
          title="Refresh"
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '4px 10px',
            color: 'white', cursor: 'pointer', fontSize: 14,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.14)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'; }}
        >
          ↻
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <p style={{ fontSize: 11, color: '#f87171', marginBottom: 12, opacity: 0.8 }}>
          ⚠️ {error} Showing local data.
        </p>
      )}

      {/* Loading */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              height: 58, borderRadius: 14,
              background: 'rgba(255,255,255,0.05)',
              animation: 'progress-glow 1.5s ease-in-out infinite',
            }} />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', opacity: 0.4 }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>🏜️</p>
          <p style={{ fontSize: 13 }}>No players yet — be the first!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {entries.map((entry, idx) => {
            const rank = RANK_COLORS[idx];
            const me = isMe(entry);
            return (
              <div
                key={entry.uid}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 12,
                  background: me
                    ? 'linear-gradient(135deg,rgba(99,179,237,0.15),rgba(168,85,247,0.15))'
                    : rank
                    ? rank.bg
                    : 'rgba(255,255,255,0.04)',
                  border: me
                    ? '1.5px solid rgba(99,179,237,0.4)'
                    : rank
                    ? `1.5px solid ${rank.border}`
                    : '1px solid rgba(255,255,255,0.06)',
                  transition: 'transform 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateX(2px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; }}
              >
                {/* Rank */}
                <div style={{
                  fontSize: rank ? 18 : 13, fontWeight: 900,
                  width: 24, textAlign: 'center', flexShrink: 0,
                  color: rank ? 'white' : 'rgba(255,255,255,0.4)',
                }}>
                  {rank ? rank.label : `${idx + 1}`}
                </div>

                {/* Avatar */}
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: me
                    ? 'linear-gradient(135deg,#63b3ed,#7c3aed)'
                    : 'rgba(255,255,255,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 900,
                }}>
                  {entry.playerName.slice(0, 2).toUpperCase()}
                </div>

                {/* Name + level */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontWeight: 800, fontSize: 13,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    color: me ? '#93c5fd' : 'white',
                  }}>
                    {entry.playerName}{me ? ' 👈 you' : ''}
                  </p>
                  <p style={{ fontSize: 11, opacity: 0.5 }}>
                    Lv.{entry.level} · 🔥{entry.currentStreak}
                  </p>
                </div>

                {/* XP */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontWeight: 900, fontSize: 14, color: '#fbbf24' }}>
                    {entry.totalXP.toLocaleString()}
                  </p>
                  <p style={{ fontSize: 10, opacity: 0.45 }}>XP</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Guest CTA */}
      {!currentUid && (
        <p style={{ fontSize: 11, textAlign: 'center', marginTop: 14, opacity: 0.4 }}>
          🔒 Sign in to appear on the global leaderboard
        </p>
      )}
    </div>
  );
};

export default Leaderboard;
