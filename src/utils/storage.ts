import { UserData, AchievementData, GameSession } from '../types';

const STORAGE_KEY = 'german-vocab-game-data';
const DEFAULT_USER_DATA: UserData = {
  stats: {
    totalXP: 0,
    level: 1,
    wordsLearned: 0,
    gamesCompleted: 0,
    accuracy: 0,
    bestStreak: 0,
    currentStreak: 0,
    totalScore: 0,
  },
  achievements: [],
  leaderboard: [],
  gameSessions: [],
  dailyChallenges: [],
  weakWords: [],
  playerName: 'Player',
  darkMode: false,
};

export const StorageManager = {
  // Initialize or get user data
  getUserData: (): UserData => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : DEFAULT_USER_DATA;
    } catch (error) {
      console.error('Error reading user data:', error);
      return DEFAULT_USER_DATA;
    }
  },

  // Save complete user data
  saveUserData: (data: UserData): void => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  },

  // Update stats after a game
  updateStats: (
    xpEarned: number,
    accuracy: number,
    correctAnswers: number,
    totalAnswers: number,
    gameType: string
  ): UserData => {
    const userData = StorageManager.getUserData();
    const stats = userData.stats;

    stats.totalXP += xpEarned;
    stats.totalScore += correctAnswers * 10 - (totalAnswers - correctAnswers) * 2;
    stats.gamesCompleted += 1;

    // Calculate new accuracy
    const totalAttempts = stats.gamesCompleted;
    stats.accuracy = Math.round(
      (stats.accuracy * (totalAttempts - 1) + accuracy) / totalAttempts
    );

    // Update level based on XP (100 XP per level)
    stats.level = Math.floor(stats.totalXP / 100) + 1;

    // Update streak
    stats.currentStreak += 1;
    if (stats.currentStreak > stats.bestStreak) {
      stats.bestStreak = stats.currentStreak;
    }

    // Add game session
    userData.gameSessions.push({
      id: Date.now().toString(),
      gameType: gameType as any,
      wordsCount: totalAnswers,
      xpEarned,
      accuracy,
      timeSpent: 0,
      timestamp: new Date().toISOString(),
      correctAnswers,
      totalAnswers,
    });

    // Check achievements
    StorageManager.checkAchievements(userData);

    StorageManager.saveUserData(userData);
    return userData;
  },

  // Add weak word for review
  addWeakWord: (wordId: string): void => {
    const userData = StorageManager.getUserData();
    const existing = userData.weakWords.find(w => w.wordId === wordId);

    if (existing) {
      existing.incorrectCount += 1;
      existing.lastAttempt = new Date().toISOString();
      existing.nextReviewDate = new Date(
        Date.now() + existing.incorrectCount * 24 * 60 * 60 * 1000
      ).toISOString();
    } else {
      userData.weakWords.push({
        wordId,
        incorrectCount: 1,
        lastAttempt: new Date().toISOString(),
        nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    StorageManager.saveUserData(userData);
  },

  // Remove weak word when mastered
  removeWeakWord: (wordId: string): void => {
    const userData = StorageManager.getUserData();
    userData.weakWords = userData.weakWords.filter(w => w.wordId !== wordId);
    StorageManager.saveUserData(userData);
  },

  // Check and unlock achievements
  checkAchievements: (userData: UserData): void => {
    const stats = userData.stats;

    const achievementChecks = [
      {
        id: 'first-xp',
        name: '🏆 First 100 XP',
        requirement: 100,
        value: stats.totalXP,
      },
      {
        id: 'first-game',
        name: '🏆 First Game',
        requirement: 1,
        value: userData.gameSessions.length,
      },
      {
        id: '50-words',
        name: '🏆 Learn 50 Words',
        requirement: 50,
        value: stats.wordsLearned,
      },
      {
        id: '7-day-streak',
        name: '🏆 7-Day Streak',
        requirement: 7,
        value: stats.bestStreak,
      },
      {
        id: 'perfect-quiz',
        name: '🏆 Perfect Quiz',
        requirement: 100,
        value: Math.max(...userData.gameSessions.map(s => s.accuracy), 0),
      },
      {
        id: 'level-5',
        name: '🏆 Level 5 Master',
        requirement: 5,
        value: stats.level,
      },
    ];

    achievementChecks.forEach(check => {
      const existing = userData.achievements.find(a => a.id === check.id);
      if (check.value >= check.requirement) {
        if (!existing || !existing.unlocked) {
          if (!existing) {
            userData.achievements.push({
              id: check.id,
              name: check.name,
              description: `Reach ${check.requirement} ${check.id.replace(/-/g, ' ')}`,
              icon: '🏆',
              unlocked: true,
              unlockedDate: new Date().toISOString(),
              requirement: check.requirement,
              currentProgress: check.value,
            });
          } else {
            existing.unlocked = true;
            existing.unlockedDate = new Date().toISOString();
            existing.currentProgress = check.value;
          }
        }
      } else if (existing) {
        existing.currentProgress = check.value;
      }
    });
  },

  // Get daily challenge
  getDailyChallenge: () => {
    const userData = StorageManager.getUserData();
    const today = new Date().toDateString();
    let challenge = userData.dailyChallenges.find(c => c.date === today);

    if (!challenge) {
      // Create new daily challenge
      const { getRandomWords } = require('../data/vocabulary');
      const words = getRandomWords(15);

      challenge = {
        id: Date.now().toString(),
        date: today,
        words: words.map((w: any) => w.id),
        completed: false,
        streak: userData.dailyChallenges.length > 0
          ? userData.dailyChallenges[userData.dailyChallenges.length - 1].streak + 1
          : 1,
      };

      userData.dailyChallenges.push(challenge);
      StorageManager.saveUserData(userData);
    }

    return challenge;
  },

  // Complete daily challenge
  completeDailyChallenge: (): void => {
    const userData = StorageManager.getUserData();
    const today = new Date().toDateString();
    const challenge = userData.dailyChallenges.find(c => c.date === today);

    if (challenge) {
      challenge.completed = true;
      StorageManager.saveUserData(userData);
    }
  },

  // Reset streak if missed a day
  checkStreakResetNeeded: (): boolean => {
    const userData = StorageManager.getUserData();
    if (userData.dailyChallenges.length === 0) return false;

    const lastChallenge = userData.dailyChallenges[userData.dailyChallenges.length - 1];
    const lastDate = new Date(lastChallenge.date);
    const today = new Date();

    const dayDiff = Math.floor(
      (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (dayDiff > 1) {
      userData.stats.currentStreak = 0;
      StorageManager.saveUserData(userData);
      return true;
    }

    return false;
  },

  // Get leaderboard
  getLeaderboard: (): any[] => {
    const userData = StorageManager.getUserData();
    return userData.leaderboard.sort((a, b) => b.totalXP - a.totalXP).slice(0, 10);
  },

  // Update player name
  setPlayerName: (name: string): void => {
    const userData = StorageManager.getUserData();
    userData.playerName = name;
    StorageManager.saveUserData(userData);
  },

  // Toggle dark mode
  toggleDarkMode: (): boolean => {
    const userData = StorageManager.getUserData();
    userData.darkMode = !userData.darkMode;
    StorageManager.saveUserData(userData);
    return userData.darkMode;
  },

  // Clear all data (reset game)
  clearAllData: (): void => {
    localStorage.removeItem(STORAGE_KEY);
  },
};
