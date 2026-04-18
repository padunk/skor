import { describe, it, expect } from 'vitest';
import { shuffleArray, generateTeams, isMixedTeam, getTeamDisplayName } from '../utils/teamGenerator';
import type { Player } from '../types';

describe('shuffleArray', () => {
  it('returns array of same length', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffleArray(arr);
    expect(shuffled).toHaveLength(arr.length);
  });

  it('contains all original elements', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffleArray(arr);
    arr.forEach(item => {
      expect(shuffled).toContain(item);
    });
  });

  it('does not mutate original array', () => {
    const arr = [1, 2, 3, 4, 5];
    const original = [...arr];
    shuffleArray(arr);
    expect(arr).toEqual(original);
  });
});

describe('generateTeams', () => {
  const createPlayers = (count: number, maleRatio = 0.5): Player[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `p${i}`,
      name: `Player${i}`,
      gender: i < count * maleRatio ? 'm' : 'f',
      isPlaceholder: false
    }));
  };

  it('creates correct number of teams for singles', () => {
    const players = createPlayers(4);
    const teams = generateTeams(players, 'single');
    
    expect(teams).toHaveLength(4);
    teams.forEach(team => {
      expect(team.players).toHaveLength(1);
    });
  });

  it('creates correct number of teams for doubles', () => {
    const players = createPlayers(4);
    const teams = generateTeams(players, 'double');
    
    expect(teams).toHaveLength(2);
    teams.forEach(team => {
      expect(team.players).toHaveLength(2);
    });
  });

  it('prioritizes mixed-gender teams', () => {
    const players = createPlayers(4, 0.5);
    const teams = generateTeams(players, 'double');
    
    // At least one mixed team expected
    const mixedTeams = teams.filter(isMixedTeam);
    expect(mixedTeams.length).toBeGreaterThan(0);
  });

  it('assigns unique team IDs', () => {
    const players = createPlayers(4);
    const teams = generateTeams(players, 'double');
    
    const ids = teams.map(t => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe('isMixedTeam', () => {
  it('returns true for mixed team', () => {
    const team = {
      id: '1',
      players: [
        { id: '1', name: 'Mark', gender: 'm' as const, isPlaceholder: false },
        { id: '2', name: 'Alice', gender: 'f' as const, isPlaceholder: false }
      ]
    };
    expect(isMixedTeam(team)).toBe(true);
  });

  it('returns false for same-gender team', () => {
    const team = {
      id: '1',
      players: [
        { id: '1', name: 'Mark', gender: 'm' as const, isPlaceholder: false },
        { id: '2', name: 'Bob', gender: 'm' as const, isPlaceholder: false }
      ]
    };
    expect(isMixedTeam(team)).toBe(false);
  });

  it('returns false for single player', () => {
    const team = {
      id: '1',
      players: [
        { id: '1', name: 'Mark', gender: 'm' as const, isPlaceholder: false }
      ]
    };
    expect(isMixedTeam(team)).toBe(false);
  });
});

describe('getTeamDisplayName', () => {
  it('returns single name for solo player', () => {
    const team = {
      id: '1',
      players: [{ id: '1', name: 'Mark', gender: 'm' as const, isPlaceholder: false }]
    };
    expect(getTeamDisplayName(team)).toBe('Mark');
  });

  it('returns joined names with ampersand', () => {
    const team = {
      id: '1',
      players: [
        { id: '1', name: 'Mark', gender: 'm' as const, isPlaceholder: false },
        { id: '2', name: 'Alice', gender: 'f' as const, isPlaceholder: false }
      ]
    };
    expect(getTeamDisplayName(team)).toBe('Mark & Alice');
  });
});
