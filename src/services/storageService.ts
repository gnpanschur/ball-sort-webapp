import type { UserProfile, LeaderboardEntry } from '../types/game';

const PROFILE_KEY = 'ballsort_profile';
const LEADERBOARD_KEY = 'ballsort_leaderboard';

export const storageService = {
  getProfile: (): UserProfile => {
    const data = localStorage.getItem(PROFILE_KEY);
    if (data) {
      try {
         const parsed = JSON.parse(data) as Partial<UserProfile>;
         
         const profile: UserProfile = {
           highestLevel: parsed.highestLevel ?? 1,
           completedLevels: parsed.completedLevels ?? [],
           bestTimes: parsed.bestTimes ?? {},
           bestMoves: parsed.bestMoves ?? {},
           theme: parsed.theme ?? 'ball',
           gameMode: parsed.gameMode ?? 'relaxed',
           audioEnabled: parsed.audioEnabled ?? true,
           audioVolume: parsed.audioVolume ?? 0.5,
           totalTimePerLevel: parsed.totalTimePerLevel ?? {},
           lastPlayedLevel: parsed.lastPlayedLevel ?? parsed.highestLevel ?? 1,
           background: parsed.background ?? 'default',
           playerName: parsed.playerName,
         };

         return profile;
      } catch (e) {
         console.error('Failed to parse profile', e);
      }
    }
    return {
      highestLevel: 1,
      completedLevels: [],
      bestTimes: {},
      bestMoves: {},
      theme: 'ball',
      gameMode: 'relaxed',
      audioEnabled: true,
      audioVolume: 0.5,
      totalTimePerLevel: {},
      background: 'Grün01.webp',
      playerName: undefined,
    };
  },

  saveProfile: (profile: UserProfile): void => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  },

  // Leaderboard Mock - stores locally
  getLeaderboard: (): LeaderboardEntry[] => {
    const data = localStorage.getItem(LEADERBOARD_KEY);
    if (data) {
      try {
         return JSON.parse(data) as LeaderboardEntry[];
      } catch(e) {
         console.error('Failed to parse leaderboard', e);
      }
    }
    return [];
  },

  submitScore: (playerName: string, levelId: number, time: number, moves: number): boolean => {
    const leaderboard = storageService.getLeaderboard();
    
    // Check if player has a better score already
    const existingIndex = leaderboard.findIndex(entry => entry.playerName === playerName && entry.levelId === levelId);
    
    let isPersonalBest = true;
    if (existingIndex !== -1) {
      const existing = leaderboard[existingIndex];
      // Time is primary, Moves secondary
      if (existing.time < time || (existing.time === time && existing.moves <= moves)) {
        isPersonalBest = false;
      }
    }

    if (!isPersonalBest) {
      return false; // Did not beat personal best
    }

    const newEntry: LeaderboardEntry = {
      playerName,
      levelId,
      time,
      moves,
      date: new Date().toISOString()
    };

    if (existingIndex !== -1) {
       leaderboard[existingIndex] = newEntry; // Update personal best
    } else {
       leaderboard.push(newEntry);
    }
    
    // Sort globally by levelId, then time, then moves
    leaderboard.sort((a, b) => {
      if (a.levelId !== b.levelId) return a.levelId - b.levelId;
      if (a.time !== b.time) return a.time - b.time;
      return a.moves - b.moves;
    });

    // We keep top 20 per level... practically we can just keep all and filter in UI, or prune here
    // For simplicity, let's keep top 20 globally or per level if list gets huge.
    // Let's just save the sorted list
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
    return true;
  },

  resetAllData: (): void => {
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(LEADERBOARD_KEY);
  }
};
