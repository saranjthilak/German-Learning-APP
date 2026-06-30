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
    <div className="glass-card p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-extrabold text-lg">🏆 Global Leaderboard</h3>
        <button
          onClick={() => setLastRefresh(Date.now())}
          title="Refresh"
          className="bg-white/5 border border-white/10 rounded-md px-2.5 py-1 text-white text-sm hover:bg-white/10 transition"
        >
          ↻
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <p className="text-xs text-red-400 mb-3 opacity-80">
          ⚠️ {error} Showing local data.
        </p>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex flex-col gap-2.5">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-6 opacity-40">
          <p className="text-4xl mb-2">🏜️</p>
          <p className="text-sm">No players yet — be the first!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry, idx) => {
            const rank = RANK_COLORS[idx];
            const me = isMe(entry);
            return (
              <div
                  key={entry.uid}
                  className="flex items-center gap-2.5 p-3 rounded-2xl transition-transform"
                  style={{
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
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateX(2px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; }}
                >
                {/* Rank */}
                <div className="font-extrabold w-6 text-center flex-shrink-0" style={{
                    fontSize: rank ? 18 : 13,
                    color: rank ? 'white' : 'rgba(255,255,255,0.4)',
                  }}>
                  {rank ? rank.label : `${idx + 1}`}
                </div>

                {/* Avatar */}
                <div className="flex items-center justify-center text-xs font-bold flex-shrink-0 rounded-full" style={{
                    width: 28, height: 28,
                    background: me
                      ? 'linear-gradient(135deg,#63b3ed,#7c3aed)'
                      : 'rgba(255,255,255,0.12)',
                  }}>
                  {entry.playerName.slice(0, 2).toUpperCase()}
                </div>

                {/* Name + level */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="font-bold text-sm truncate" style={{
                     color: me ? '#93c5fd' : 'white',
                   }}>
                    {entry.playerName}{me ? ' 👈 you' : ''}
                  </p>
                  <p style={{ fontSize: 11, opacity: 0.5 }}>
                    Lv.{entry.level} · 🔥{entry.currentStreak}
                  </p>
                </div>

                {/* XP */}
                <div className="text-right flex-shrink-0">
                  <p className="font-extrabold text-lg text-yellow-400">
                    {entry.totalXP.toLocaleString()}
                  </p>
                  <p className="text-xs opacity-45">XP</p>
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
