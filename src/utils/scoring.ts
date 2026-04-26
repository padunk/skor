import type { Match, LeaderboardEntry, Player, TournamentFormat } from '../types';
import { computePlayerPoints } from './roundRobin';

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

interface PlayerStats {
  name: string;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  pointsScored: number;
  matchesPlayed: number;
}

/**
 * Generate leaderboard from all matches.
 *
 * For round_robin (default), entries are sorted by W/L/D points, then wins.
 * For americano/mexicano, entries are sorted by accumulated raw points scored
 * (sum of team scoreA/scoreB across matches the player participated in),
 * then wins. The W/L/D `points` field is still populated for compatibility.
 *
 * `pointsScored` is always populated (sum of team scores per player).
 */
export function generateLeaderboard(
  matches: Match[],
  players: Player[],
  format: TournamentFormat = 'round_robin',
): LeaderboardEntry[] {
  const stats = new Map<string, PlayerStats>();

  for (const player of players) {
    stats.set(player.id, {
      name: player.name,
      wins: 0,
      losses: 0,
      draws: 0,
      points: 0,
      pointsScored: 0,
      matchesPlayed: 0,
    });
  }

  for (const match of matches) {
    if (match.scoreA === null || match.scoreB === null) continue;

    const { winner } = match;
    const teamAPlayers = match.teamA.players;
    const teamBPlayers = match.teamB.players;

    for (const player of [...teamAPlayers, ...teamBPlayers]) {
      const stat = stats.get(player.id);
      if (stat) stat.matchesPlayed++;
    }

    if (winner === 'A') {
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
      for (const player of [...teamAPlayers, ...teamBPlayers]) {
        const stat = stats.get(player.id);
        if (stat) {
          stat.draws++;
          stat.points += POINTS_DRAW;
        }
      }
    }
  }

  // Populate pointsScored from raw team scores (sum of scoreA/scoreB).
  const pointsScored = computePlayerPoints(matches);
  for (const [playerId, scored] of pointsScored) {
    const stat = stats.get(playerId);
    if (stat) stat.pointsScored = scored;
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
      pointsScored: stat.pointsScored,
      matchesPlayed: stat.matchesPlayed,
      rank: 0,
    });
  }

  if (format === 'americano' || format === 'mexicano') {
    entries.sort((a, b) => {
      if (b.pointsScored !== a.pointsScored) return b.pointsScored - a.pointsScored;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.name.localeCompare(b.name);
    });
  } else {
    entries.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.name.localeCompare(b.name);
    });
  }

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
      pointsScored: number;
      matchesPlayed: number;
    }
  >();

  for (const leaderboard of leaderboards) {
    for (const entry of leaderboard) {
      const existing = stats.get(entry.playerId);
      const scored = entry.pointsScored ?? 0;
      if (existing) {
        existing.wins += entry.wins;
        existing.losses += entry.losses;
        existing.draws += entry.draws;
        existing.points += entry.points;
        existing.pointsScored += scored;
        existing.matchesPlayed += entry.matchesPlayed;
      } else {
        stats.set(entry.playerId, {
          name: entry.name,
          wins: entry.wins,
          losses: entry.losses,
          draws: entry.draws,
          points: entry.points,
          pointsScored: scored,
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
      pointsScored: stat.pointsScored,
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
