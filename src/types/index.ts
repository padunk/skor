export interface Player {
  id: string;
  name: string;
  gender: 'm' | 'f';
  isPlaceholder: boolean;
}

export interface Team {
  id: string;
  players: Player[];
}

export interface Match {
  id: string;
  round: number;  // Time slot number (1, 2, 3...)
  court: number;
  teamA: Team;
  teamB: Team;
  scoreA: number | null;
  scoreB: number | null;
  winner: 'A' | 'B' | 'draw' | null;
}

export interface GameState {
  sport: string;
  courts: 1 | 2;
  teamSize: 'single' | 'double';
  durationMinutes: number;
  participants: Player[];
  matches: Match[];
  isGenerated: boolean;
}

export interface LeaderboardEntry {
  playerId: string;
  name: string;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  matchesPlayed: number;
  rank: number;
}

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export type GameAction =
  | { type: 'SET_SPORT'; payload: string }
  | { type: 'SET_COURTS'; payload: 1 | 2 }
  | { type: 'SET_TEAM_SIZE'; payload: 'single' | 'double' }
  | { type: 'SET_DURATION'; payload: number }
  | { type: 'SET_PARTICIPANTS'; payload: Player[] }
  | { type: 'GENERATE_MATCHES'; payload: Match[] }
  | { type: 'APPEND_MATCHES'; payload: Match[] }
  | { type: 'UPDATE_SCORE'; payload: { matchId: string; scoreA: number; scoreB: number } }
  | { type: 'RESET' }
  | { type: 'RESTART' }
  | { type: 'NEW_TEAMS' };
