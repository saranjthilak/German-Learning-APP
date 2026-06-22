// User Progress and Stats
export interface UserStats {
  totalXP: number;
  level: number;
  wordsLearned: number;
  gamesCompleted: number;
  accuracy: number;
  bestStreak: number;
  currentStreak: number;
  totalScore: number;
}

export interface AchievementData {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedDate?: string;
  requirement: number;
  currentProgress: number;
}

export interface LeaderboardEntry {
  id: string;
  learnedWords: string[];
  playerName: string;
  level: number;
  totalXP: number;
  wordsLearned: number;
  accuracy: number;
}

export interface GameSession {
  id: string;
  gameType: 'matching' | 'memory' | 'quiz' | 'typing' | 'pronunciation';
  wordsCount: number;
  xpEarned: number;
  accuracy: number;
  timeSpent: number;
  timestamp: string;
  correctAnswers: number;
  totalAnswers: number;
}

export interface DailyChallenge {
  id: string;
  date: string;
  words: string[];
  completed: boolean;
  streak: number;
}

export interface WeakWord {
  wordId: string;
  incorrectCount: number;
  correctCount: number;
  lastAttempt: string;
  nextReviewDate: string;
  easeFactor: number;
  interval: number;
}

export interface UserData {
  stats: UserStats;
  achievements: AchievementData[];
  leaderboard: LeaderboardEntry[];
  gameSessions: GameSession[];
  dailyChallenges: DailyChallenge[];
  weakWords: WeakWord[];
  learnedWords: string[];
  playerName: string;
  darkMode: boolean;
  tutorSessions: TutorSession[];
}

// ── Voice Tutor ───────────────────────────────────────────────────────────────

export type ProficiencyLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export type ConversationTopic =
  | 'daily-conversation'
  | 'restaurant'
  | 'shopping'
  | 'airport'
  | 'hotel'
  | 'job-interview'
  | 'doctor-visit'
  | 'office-meeting'
  | 'travel'
  | 'friends-and-family';

export interface TutorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  language: 'german' | 'mixed' | 'english';
  timestamp: string;
  hadStruggle?: boolean;
}

export interface TutorSession {
  id: string;
  topic: ConversationTopic;
  level: ProficiencyLevel;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  messages: TutorMessage[];
  wordsUsed: string[];
  struggleCount: number;
  xpEarned: number;
}
