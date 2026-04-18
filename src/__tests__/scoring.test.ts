import { describe, it, expect } from 'vitest';
import { 
  determineWinner, 
  calculatePoints, 
  updateMatchScore, 
  generateLeaderboard,
  getMatchCompletionPercentage,
  formatRank 
} from '../utils/scoring';
import type { Match, Player } from '../types';

describe('determineWinner', () => {
  it('returns A when team A wins', () => {
    expect(determineWinner(3, 1)).toBe('A');
  });

  it('returns B when team B wins', () => {
    expect(determineWinner(1, 3)).toBe('B');
  });

  it('returns draw when scores are equal', () => {
    expect(determineWinner(2, 2)).toBe('draw');
  });

  it('handles zero scores', () => {
    expect(determineWinner(0, 0)).toBe('draw');
    expect(determineWinner(1, 0)).toBe('A');
  });
});

describe('calculatePoints', () => {
  it('returns 3 for a win', () => {
    expect(calculatePoints(true, false)).toBe(3);
  });

  it('returns 0 for a loss', () => {
    expect(calculatePoints(false, false)).toBe(0);
  });

  it('returns 1 for a draw', () => {
    expect(calculatePoints(false, true)).toBe(1);
    expect(calculatePoints(true, true)).toBe(1);
  });
});

describe('updateMatchScore', () => {
  const createMatch = (): Match => ({
    id: 'm1',
    round: 1,
    court: 1,
    teamA: { id: 't1', players: [{ id: 'p1', name: 'Team A Player', gender: 'm', isPlaceholder: false }] },
    teamB: { id: 't2', players: [{ id: 'p2', name: 'Team B Player', gender: 'f', isPlaceholder: false }] },
    scoreA: null,
    scoreB: null,
    winner: null
  });

  it('updates scores correctly', () => {
    const match = createMatch();
    const updated = updateMatchScore(match, 3, 1);
    
    expect(updated.scoreA).toBe(3);
    expect(updated.scoreB).toBe(1);
    expect(updated.winner).toBe('A');
  });

  it('detects draw correctly', () => {
    const match = createMatch();
    const updated = updateMatchScore(match, 2, 2);
    
    expect(updated.winner).toBe('draw');
  });

  it('does not mutate original match', () => {
    const match = createMatch();
    updateMatchScore(match, 3, 1);
    
    expect(match.scoreA).toBeNull();
    expect(match.scoreB).toBeNull();
  });
});

describe('generateLeaderboard', () => {
  const createPlayers = (): Player[] => [
    { id: 'p1', name: 'Alice', gender: 'f', isPlaceholder: false },
    { id: 'p2', name: 'Bob', gender: 'm', isPlaceholder: false },
    { id: 'p3', name: 'Charlie', gender: 'm', isPlaceholder: false },
    { id: 'p4', name: 'Diana', gender: 'f', isPlaceholder: false }
  ];

  const createMatch = (round: number, scoreA: number, scoreB: number, players: Player[]): Match => ({
    id: `m${round}`,
    round,
    court: 1,
    teamA: { id: 't1', players: [players[0], players[1]] },
    teamB: { id: 't2', players: [players[2], players[3]] },
    scoreA,
    scoreB,
    winner: determineWinner(scoreA, scoreB)
  });

  it('ranks players by points', () => {
    const players = createPlayers();
    const matches = [
      createMatch(1, 3, 1, players), // Alice & Bob win
      createMatch(2, 1, 3, players)  // Charlie & Diana win
    ];
    
    const leaderboard = generateLeaderboard(matches, players);
    
    expect(leaderboard[0].points).toBeGreaterThanOrEqual(leaderboard[1].points);
  });

  it('awards correct points for wins', () => {
    const players = createPlayers();
    const matches = [
      createMatch(1, 3, 1, players), // Alice & Bob win
    ];
    
    const leaderboard = generateLeaderboard(matches, players);
    const alice = leaderboard.find(e => e.name === 'Alice');
    const charlie = leaderboard.find(e => e.name === 'Charlie');
    
    expect(alice?.points).toBe(3);
    expect(charlie?.points).toBe(0);
  });

  it('awards points for draws', () => {
    const players = createPlayers();
    const matches = [
      createMatch(1, 2, 2, players),
    ];
    
    const leaderboard = generateLeaderboard(matches, players);
    const allHaveOnePoint = leaderboard.every(e => e.points === 1);
    expect(allHaveOnePoint).toBe(true);
  });

  it('tracks wins and losses', () => {
    const players = createPlayers();
    const matches = [
      createMatch(1, 3, 1, players), // Alice & Bob win
    ];
    
    const leaderboard = generateLeaderboard(matches, players);
    const alice = leaderboard.find(e => e.name === 'Alice');
    const charlie = leaderboard.find(e => e.name === 'Charlie');
    
    expect(alice?.wins).toBe(1);
    expect(alice?.losses).toBe(0);
    expect(charlie?.wins).toBe(0);
    expect(charlie?.losses).toBe(1);
  });

  it('excludes incomplete matches', () => {
    const players = createPlayers();
    const matches: Match[] = [
      { ...createMatch(1, 3, 1, players), scoreA: null, scoreB: null, winner: null }
    ];
    
    const leaderboard = generateLeaderboard(matches, players);
    expect(leaderboard.every(e => e.wins === 0 && e.losses === 0)).toBe(true);
  });

  it('sorts by wins when points are equal', () => {
    const players = createPlayers();
    const matches = [
      createMatch(1, 3, 1, players), // Alice & Bob win
      createMatch(2, 1, 3, players)  // Charlie & Diana win
    ];
    
    const leaderboard = generateLeaderboard(matches, players);
    
    // Players with same points should be sorted by wins
    const points = leaderboard.map(e => e.points);
    const hasTie = points[0] === points[1];
    if (hasTie) {
      expect(leaderboard[0].wins).toBeGreaterThanOrEqual(leaderboard[1].wins);
    }
  });
});

describe('getMatchCompletionPercentage', () => {
  it('returns 0 for empty matches', () => {
    expect(getMatchCompletionPercentage([])).toBe(0);
  });

  it('returns 100 when all matches are complete', () => {
    const matches: Match[] = [
      { id: '1', round: 1, court: 1, teamA: { id: 't1', players: [] }, teamB: { id: 't2', players: [] }, scoreA: 3, scoreB: 1, winner: 'A' },
      { id: '2', round: 2, court: 1, teamA: { id: 't1', players: [] }, teamB: { id: 't2', players: [] }, scoreA: 2, scoreB: 2, winner: 'draw' }
    ];
    expect(getMatchCompletionPercentage(matches)).toBe(100);
  });

  it('calculates percentage correctly', () => {
    const matches: Match[] = [
      { id: '1', round: 1, court: 1, teamA: { id: 't1', players: [] }, teamB: { id: 't2', players: [] }, scoreA: 3, scoreB: 1, winner: 'A' },
      { id: '2', round: 2, court: 1, teamA: { id: 't1', players: [] }, teamB: { id: 't2', players: [] }, scoreA: null, scoreB: null, winner: null }
    ];
    expect(getMatchCompletionPercentage(matches)).toBe(50);
  });
});

describe('formatRank', () => {
  it('formats 1st correctly', () => expect(formatRank(1)).toBe('1st'));
  it('formats 2nd correctly', () => expect(formatRank(2)).toBe('2nd'));
  it('formats 3rd correctly', () => expect(formatRank(3)).toBe('3rd'));
  it('formats 4th and up correctly', () => {
    expect(formatRank(4)).toBe('4th');
    expect(formatRank(10)).toBe('10th');
    expect(formatRank(21)).toBe('21st');
    expect(formatRank(22)).toBe('22nd');
    expect(formatRank(23)).toBe('23rd');
  });
});
