import { describe, it, expect } from 'vitest';
import {
  generateTimeBasedSchedule,
  generateAdditionalMatches,
  computePlayerPoints,
  computePlayerPlayCount,
  type ScheduleOptions,
} from '../utils/roundRobin';
import type { Match, Player } from '../types';

function makePlayers(n: number, opts: { genderPattern?: ('m' | 'f')[] } = {}): Player[] {
  const out: Player[] = [];
  for (let i = 0; i < n; i++) {
    const gender = opts.genderPattern
      ? opts.genderPattern[i % opts.genderPattern.length]
      : i % 2 === 0
        ? 'm'
        : 'f';
    out.push({
      id: `p${i + 1}`,
      name: `Player${i + 1}`,
      gender,
      isPlaceholder: false,
    });
  }
  return out;
}

function partnersOf(matches: Match[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  const ensure = (id: string) => {
    if (!map.has(id)) map.set(id, new Set());
    return map.get(id)!;
  };
  for (const m of matches) {
    if (m.teamA.players.length === 2) {
      const [a, b] = m.teamA.players;
      ensure(a.id).add(b.id);
      ensure(b.id).add(a.id);
    }
    if (m.teamB.players.length === 2) {
      const [a, b] = m.teamB.players;
      ensure(a.id).add(b.id);
      ensure(b.id).add(a.id);
    }
  }
  return map;
}

function partnerPairCounts(matches: Match[]): Map<string, number> {
  const out = new Map<string, number>();
  const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  for (const m of matches) {
    if (m.teamA.players.length === 2) {
      const k = key(m.teamA.players[0].id, m.teamA.players[1].id);
      out.set(k, (out.get(k) || 0) + 1);
    }
    if (m.teamB.players.length === 2) {
      const k = key(m.teamB.players[0].id, m.teamB.players[1].id);
      out.set(k, (out.get(k) || 0) + 1);
    }
  }
  return out;
}

describe('generateTimeBasedSchedule (round_robin / default)', () => {
  it('returns matches for 8 players, 2 courts, 60 minutes', () => {
    const players = makePlayers(8);
    const matches = generateTimeBasedSchedule(players, 2, 60);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.length).toBeLessThanOrEqual(12);
    // Every match has 2 players per side
    for (const m of matches) {
      expect(m.teamA.players.length).toBe(2);
      expect(m.teamB.players.length).toBe(2);
    }
  });

  it('defaults to round_robin doubles when options omitted', () => {
    const players = makePlayers(8);
    const a = generateTimeBasedSchedule(players, 2, 60);
    const b = generateTimeBasedSchedule(players, 2, 60, {
      format: 'round_robin',
      teamSize: 'double',
    });
    // Same shape (counts/sides), output is randomised so length is the determinism we check.
    expect(a.length).toBe(b.length);
  });
});

describe('Americano doubles', () => {
  const opts: ScheduleOptions = { format: 'americano', teamSize: 'double' };

  it('with 4 players produces exactly 3 rounds and every pair partners exactly once', () => {
    const players = makePlayers(4);
    const matches = generateTimeBasedSchedule(players, 1, 60, opts);
    const rounds = new Set(matches.map((m) => m.round));
    expect(rounds.size).toBe(3);
    expect(matches.length).toBe(3);

    const counts = partnerPairCounts(matches);
    // C(4,2) = 6 unique partnerships, each must appear exactly once.
    expect(counts.size).toBe(6);
    for (const c of counts.values()) {
      expect(c).toBe(1);
    }
  });

  it('with 8 players, 2 courts, sufficient duration: no repeated partnerships and balanced play counts', () => {
    const players = makePlayers(8);
    const matches = generateTimeBasedSchedule(players, 2, 180, opts);
    const counts = partnerPairCounts(matches);
    for (const c of counts.values()) {
      expect(c).toBeLessThanOrEqual(1);
    }
    const playCounts = Array.from(computePlayerPlayCount(matches).values());
    const max = Math.max(...playCounts);
    const min = Math.min(...playCounts);
    expect(max - min).toBeLessThanOrEqual(1);

    // Sanity: every player partners several others.
    const partners = partnersOf(matches);
    for (const p of players) {
      expect(partners.get(p.id)?.size ?? 0).toBeGreaterThan(0);
    }
  });
});

describe('Mexicano doubles', () => {
  const opts: ScheduleOptions = { format: 'mexicano', teamSize: 'double', pointsPerMatch: 24 };

  it('initial generation produces only round 1', () => {
    const players = makePlayers(8);
    const matches = generateTimeBasedSchedule(players, 2, 180, opts);
    const rounds = new Set(matches.map((m) => m.round));
    expect(rounds.size).toBe(1);
    expect(matches.every((m) => m.round === 1)).toBe(true);
  });

  it('after scoring, generateAdditionalMatches re-pairs by standings (1+last vs middle)', () => {
    // 4 controlled players for unambiguous ranking
    const players = makePlayers(4);
    // Round 1: teamA = [p1,p2] scored 20, teamB = [p3,p4] scored 4
    // => points: p1=20, p2=20, p3=4, p4=4
    // Ranking with name tiebreak: p1, p2, p3, p4
    // Mexicano [p1,p2,p3,p4] => [p1,p4] vs [p2,p3]
    const roundA: Match = {
      id: 'm1',
      round: 1,
      court: 1,
      teamA: { id: 'tA', players: [players[0], players[1]] }, // p1, p2
      teamB: { id: 'tB', players: [players[2], players[3]] }, // p3, p4
      scoreA: 20,
      scoreB: 4,
      winner: 'A',
    };
    // After round 1: points = p1:20, p2:20, p3:4, p4:4
    // Ranking ties broken by name: p1, p2, p3, p4.
    // Mexicano pairing for [p1, p2, p3, p4] => [p1, p4] vs [p2, p3].
    const updated = generateAdditionalMatches(players, 1, [roundA], 1, opts);
    expect(updated.length).toBe(2);
    const newMatch = updated[1];
    const teamA = newMatch.teamA.players.map((p) => p.id).sort();
    const teamB = newMatch.teamB.players.map((p) => p.id).sort();
    // Top + bottom vs middle two
    expect([teamA, teamB]).toEqual(
      expect.arrayContaining([
        ['p1', 'p4'].sort(),
        ['p2', 'p3'].sort(),
      ]),
    );
  });
});

describe('Singles round_robin', () => {
  const opts: ScheduleOptions = { format: 'round_robin', teamSize: 'single' };

  it('with 6 players, 2 courts: 2 matches per round, balanced play counts', () => {
    const players = makePlayers(6);
    const matches = generateTimeBasedSchedule(players, 2, 60, opts);
    expect(matches.length).toBeGreaterThan(0);
    // Check matches per round
    const byRound = new Map<number, number>();
    for (const m of matches) {
      byRound.set(m.round, (byRound.get(m.round) || 0) + 1);
      expect(m.teamA.players.length).toBe(1);
      expect(m.teamB.players.length).toBe(1);
    }
    for (const c of byRound.values()) {
      expect(c).toBe(2);
    }
    const playCounts = Array.from(computePlayerPlayCount(matches).values());
    expect(Math.max(...playCounts) - Math.min(...playCounts)).toBeLessThanOrEqual(1);
  });
});

describe('Singles americano', () => {
  const opts: ScheduleOptions = { format: 'americano', teamSize: 'single' };

  it('with 5 players: no immediate rematches and sit-outs balanced', () => {
    const players = makePlayers(5);
    const matches = generateTimeBasedSchedule(players, 2, 120, opts);
    expect(matches.length).toBeGreaterThan(0);

    // No immediate rematch: the same opponent pair should not appear in
    // consecutive rounds.
    const byRound = new Map<number, Set<string>>();
    for (const m of matches) {
      const a = m.teamA.players[0].id;
      const b = m.teamB.players[0].id;
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      const set = byRound.get(m.round) || new Set<string>();
      set.add(key);
      byRound.set(m.round, set);
    }
    const rounds = [...byRound.keys()].sort((a, b) => a - b);
    for (let i = 1; i < rounds.length; i++) {
      const prev = byRound.get(rounds[i - 1])!;
      const curr = byRound.get(rounds[i])!;
      for (const k of curr) {
        expect(prev.has(k)).toBe(false);
      }
    }

    // Sit-outs balanced: with N=5 and 2 courts, each round seats 4, 1 sits out
    // per round. Over enough rounds, sitOut counts should differ by at most ~1.
    const playCounts = Array.from(computePlayerPlayCount(matches).values());
    expect(Math.max(...playCounts) - Math.min(...playCounts)).toBeLessThanOrEqual(2);
  });
});

describe('computePlayerPoints', () => {
  it('sums scoreA/scoreB across matches based on team membership', () => {
    const players = makePlayers(4);
    const matches: Match[] = [
      {
        id: '1',
        round: 1,
        court: 1,
        teamA: { id: 'a', players: [players[0], players[1]] },
        teamB: { id: 'b', players: [players[2], players[3]] },
        scoreA: 10,
        scoreB: 6,
        winner: 'A',
      },
      {
        id: '2',
        round: 2,
        court: 1,
        teamA: { id: 'a', players: [players[0], players[2]] },
        teamB: { id: 'b', players: [players[1], players[3]] },
        scoreA: 8,
        scoreB: 8,
        winner: 'draw',
      },
      {
        id: '3',
        round: 3,
        court: 1,
        teamA: { id: 'a', players: [players[0], players[3]] },
        teamB: { id: 'b', players: [players[1], players[2]] },
        scoreA: null,
        scoreB: null,
        winner: null,
      },
    ];
    const pts = computePlayerPoints(matches);
    expect(pts.get('p1')).toBe(10 + 8); // p1 on team A both rounds
    expect(pts.get('p2')).toBe(10 + 8); // p2 team A round 1, team B round 2
    expect(pts.get('p3')).toBe(6 + 8);
    expect(pts.get('p4')).toBe(6 + 8);
  });
});
