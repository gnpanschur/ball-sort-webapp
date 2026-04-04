export type BallColor = number; // 1 to 12

export interface TubeData {
  id: number;
  balls: BallColor[]; // Index 0 is the bottom of the tube
}

export interface LevelData {
  id: number;
  tubeCapacity: number;
  initialTubes: TubeData[];
  timeLimitSeconds?: number;
  itemShape?: 'ball' | 'ring';
  horizontalTubeId?: number;
  horizontalTubeCapacity?: number;
  moveSingleBallOnly?: boolean;
  winHeight?: number;
}

export interface GameState {
  tubes: TubeData[];
  moves: number;
  timeElapsed: number;
  status: 'playing' | 'won';
  history: TubeData[][];
  lastMove?: {
    targetTubeId: number;
    count: number;
    timestamp: number;
  };
  lastCompletedTube?: {
    id: number;
    timestamp: number;
  };
}

export type ThemeType = 'ball' | 'glass' | 'neon' | 'gems' | 'casino';
export type GameMode = 'relaxed' | 'timed';

export interface UserProfile {
  highestLevel: number;
  completedLevels: number[];
  bestTimes: Record<number, number>; // levelId -> time in seconds
  bestMoves: Record<number, number>; // levelId -> moves
  theme: ThemeType;
  gameMode: GameMode;
  audioEnabled: boolean;
  audioVolume: number;
}

export interface LeaderboardEntry {
  playerName: string;
  levelId: number;
  time: number;
  moves: number;
  date: string;
}
