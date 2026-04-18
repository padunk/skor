import type { Match, LeaderboardEntry, Player } from '../types';

// Points awarded for different outcomes
const POINTS_WIN = 3;
const POINTS_DRAW = 1;
const POINTS_LOSS = 0;

/**
 * Determine winner from scores
 */
export function determineWinner(scoreA: number, scoreB: number): 'A' | 'B' | 'draw' {
  if (scoreA > scoreB) return 'A';
  if (scoreB > scoreA) return 'B';
  return 'draw';
}

/**
 * Calculate points for a team based on match result
 */
export function calculatePoints(won: boolean, isDraw: boolean): number {
  if (isDraw) return POINTS_DRAW;
  return won ? POINTS_WIN : POINTS_LOSS;
}

/**
 * Update a match with a score
 */
export function updateMatchScore(
  match: Match,
  scoreA: number,
  scoreB: number
): Match {
  return {
    ...match,
    scoreA,
    scoreB,
    winner: determineWinner(scoreA, scoreB)
  };
}

/**
 * Generate leaderboard from all matches
 */
export function generateLeaderboard(
  matches: Match[],
  players: Player[]
): LeaderboardEntry[] {
  // Initialize stats for all players
  const stats = new Map<string, { name: string; wins: number; losses: number; draws: number; points: number; matchesPlayed: number }>();
  
  for (const player of players) {
    stats.set(player.id, {
      name: player.name,
      wins: 0,
      losses: 0,
      draws: 0,
      points: 0,
      matchesPlayed: 0
    });
  }
  
  // Process each match
  for (const match of matches) {
    // Skip incomplete matches
    if (match.scoreA === null || match.scoreB === null) continue;
    
    const { winner } = match;
    const teamAPlayers = match.teamA.players;
    const teamBPlayers = match.teamB.players;
    
    // Count matches played for all participants
    for (const player of [...teamAPlayers, ...teamBPlayers]) {
      const stat = stats.get(player.id);
      if (stat) {
        stat.matchesPlayed++;
      }
    }
    
    if (winner === 'A') {
      // Team A wins
      for (const player of teamAPlayers) {
        const stat = stats.get(player.id);
        if (stat) {
          stat.wins++;
          stat.points += POINTS_WIN;
        }
      }
      for (const player of teamBPlayers) {
        const stat = stats.get(player.id);
        if (stat) {
          stat.losses++;
          stat.points += POINTS_LOSS;
        }
      }
    } else if (winner === 'B') {
      // Team B wins
      for (const player of teamBPlayers) {
        const stat = stats.get(player.id);
        if (stat) {
          stat.wins++;
          stat.points += POINTS_WIN;
        }
      }
      for (const player of teamAPlayers) {
        const stat = stats.get(player.id);
        if (stat) {
          stat.losses++;
          stat.points += POINTS_LOSS;
        }
      }
    } else if (winner === 'draw') {
      // Draw
      for (const player of [...teamAPlayers, ...teamBPlayers]) {
        const stat = stats.get(player.id);
        if (stat) {
          stat.draws++;
          stat.points += POINTS_DRAW;
        }
      }
    }
  }
  
  // Convert to leaderboard entries
  const entries: LeaderboardEntry[] = [];
  
  for (const [playerId, stat] of stats) {
    entries.push({
      playerId,
      name: stat.name,
      wins: stat.wins,
      losses: stat.losses,
      draws: stat.draws,
      points: stat.points,
      matchesPlayed: stat.matchesPlayed,
      rank: 0
    });
  }
  
  // Sort by points (desc), then wins (desc), then alphabetically
  entries.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.name.localeCompare(b.name);
  });
  
  // Assign ranks
  let currentRank = 1;
  for (const entry of entries) {
    entry.rank = currentRank++;
  }
  
  return entries;
}

/**
 * Check if all matches have scores
 */
export function areAllMatchesScored(matches: Match[]): boolean {
  return matches.every(m => m.scoreA !== null && m.scoreB !== null);
}

/**
 * Get match completion percentage
 */
export function getMatchCompletionPercentage(matches: Match[]): number {
  if (matches.length === 0) return 0;
  const completed = matches.filter(m => m.scoreA !== null && m.scoreB !== null).length;
  return Math.round((completed / matches.length) * 100);
}

/**
 * Format rank with suffix
 */
export function formatRank(rank: number): string {
  if (rank === 1) return '1st';
  if (rank === 2) return '2nd';
  if (rank === 3) return '3rd';
  
  // Special cases: 11th, 12th, 13th use 'th'
  const lastDigit = rank % 10;
  const lastTwoDigits = rank % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return `${rank}th`;
  }
  
  if (lastDigit === 1) return `${rank}st`;
  if (lastDigit === 2) return `${rank}nd`;
  if (lastDigit === 3) return `${rank}rd`;
  return `${rank}th`;
}

export function mergeLeaderboards(
  leaderboards: LeaderboardEntry[][]
): LeaderboardEntry[] {
  const stats = new Map<
    string,
    {
      name: string;
      wins: number;
      losses: number;
      draws: number;
      points: number;
      matchesPlayed: number;
    }
  >();

  for (const leaderboard of leaderboards) {
    for (const entry of leaderboard) {
      const existing = stats.get(entry.playerId);
      if (existing) {
        existing.wins += entry.wins;
        existing.losses += entry.losses;
        existing.draws += entry.draws;
        existing.points += entry.points;
        existing.matchesPlayed += entry.matchesPlayed;
      } else {
        stats.set(entry.playerId, {
          name: entry.name,
          wins: entry.wins,
          losses: entry.losses,
          draws: entry.draws,
          points: entry.points,
          matchesPlayed: entry.matchesPlayed,
        });
      }
    }
  }

  const entries: LeaderboardEntry[] = [];
  for (const [playerId, stat] of stats) {
    entries.push({
      playerId,
      name: stat.name,
      wins: stat.wins,
      losses: stat.losses,
      draws: stat.draws,
      points: stat.points,
      matchesPlayed: stat.matchesPlayed,
      rank: 0,
    });
  }

  entries.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.name.localeCompare(b.name);
  });

  let currentRank = 1;
  for (const entry of entries) {
    entry.rank = currentRank++;
  }

  return entries;
}
