import type { Player, Team, Match } from '../types';

const MINUTES_PER_MATCH = 5;

function pairKey(p1: Player, p2: Player): string {
  return p1.id < p2.id ? `${p1.id}|${p2.id}` : `${p2.id}|${p1.id}`;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function combinationsOf4(players: Player[]): Player[][] {
  const out: Player[][] = [];
  for (let i = 0; i < players.length - 3; i++) {
    for (let j = i + 1; j < players.length - 2; j++) {
      for (let k = j + 1; k < players.length - 1; k++) {
        for (let l = k + 1; l < players.length; l++) {
          out.push([players[i], players[j], players[k], players[l]]);
        }
      }
    }
  }
  return out;
}

function pairingsOf4(players: Player[]): [[Player, Player], [Player, Player]][] {
  const [a, b, c, d] = players;
  return [
    [[a, b], [c, d]],
    [[a, c], [b, d]],
    [[a, d], [b, c]],
  ];
}

function isMixed(pair: [Player, Player]): boolean {
  return pair[0].gender !== pair[1].gender;
}

interface BestCandidate {
  teamA: [Player, Player];
  teamB: [Player, Player];
  score: number;
  chosen: Player[];
}

interface TrackerState {
  playCount: Map<string, number>;
  pairCount: Map<string, number>;
  mfCovered: Set<string>;
  lastRoundPairs: Set<string>;
  totalMFCoverageTarget: Set<string>;
}

function createCoverageTarget(players: Player[]): Set<string> {
  const males = players.filter((p) => p.gender === 'm');
  const females = players.filter((p) => p.gender === 'f');
  const target = new Set<string>();

  for (const m of males) {
    for (const f of females) {
      target.add(pairKey(m, f));
    }
  }

  return target;
}

function initializeTracker(players: Player[], existingMatches: Match[]): TrackerState {
  const playCount = new Map<string, number>();
  const pairCount = new Map<string, number>();
  const mfCovered = new Set<string>();
  const lastRoundPairs = new Set<string>();
  const totalMFCoverageTarget = createCoverageTarget(players);

  players.forEach((p) => playCount.set(p.id, 0));

  for (const m of existingMatches) {
    const pairA = pairKey(m.teamA.players[0], m.teamA.players[1]);
    const pairB = pairKey(m.teamB.players[0], m.teamB.players[1]);

    pairCount.set(pairA, (pairCount.get(pairA) || 0) + 1);
    pairCount.set(pairB, (pairCount.get(pairB) || 0) + 1);

    if (isMixed([m.teamA.players[0], m.teamA.players[1]])) {
      mfCovered.add(pairA);
    }

    if (isMixed([m.teamB.players[0], m.teamB.players[1]])) {
      mfCovered.add(pairB);
    }

    for (const p of [...m.teamA.players, ...m.teamB.players]) {
      playCount.set(p.id, (playCount.get(p.id) || 0) + 1);
    }
  }

  if (existingMatches.length > 0) {
    const lastRound = Math.max(...existingMatches.map((m) => m.round));
    const previousRound = existingMatches.filter((m) => m.round === lastRound);
    for (const m of previousRound) {
      lastRoundPairs.add(pairKey(m.teamA.players[0], m.teamA.players[1]));
      lastRoundPairs.add(pairKey(m.teamB.players[0], m.teamB.players[1]));
    }
  }

  return {
    playCount,
    pairCount,
    mfCovered,
    lastRoundPairs,
    totalMFCoverageTarget,
  };
}

function pickBestForCourt(
  available: Player[],
  tracker: TrackerState,
  requireNoConsecutive: boolean,
  requireMixedWhenPossible: boolean,
): BestCandidate | null {
  if (available.length < 4) return null;

  const candidatePool = shuffleArray([...available]).sort((a, b) => {
    const countA = tracker.playCount.get(a.id) || 0;
    const countB = tracker.playCount.get(b.id) || 0;
    if (countA !== countB) return countA - countB;
    return a.name.localeCompare(b.name);
  });

  const combos = combinationsOf4(candidatePool);
  let best: BestCandidate | null = null;

  for (const combo of combos) {
    const maleCount = combo.filter((p) => p.gender === 'm').length;
    const femaleCount = combo.length - maleCount;
    const canFormTwoMixedPairs = maleCount >= 2 && femaleCount >= 2;

    for (const [a, b] of pairingsOf4(combo)) {
      const keyA = pairKey(a[0], a[1]);
      const keyB = pairKey(b[0], b[1]);

      if (requireNoConsecutive && (tracker.lastRoundPairs.has(keyA) || tracker.lastRoundPairs.has(keyB))) {
        continue;
      }

      if (requireMixedWhenPossible && canFormTwoMixedPairs) {
        if (!isMixed(a) || !isMixed(b)) {
          continue;
        }
      }

      let score = 0;
      const allMFCovered = tracker.mfCovered.size >= tracker.totalMFCoverageTarget.size;

      if (isMixed(a)) {
        if (!tracker.mfCovered.has(keyA)) {
          score += 5000;
        } else if (!allMFCovered) {
          score -= 2500;
        }
      } else {
        score -= 900;
      }

      if (isMixed(b)) {
        if (!tracker.mfCovered.has(keyB)) {
          score += 5000;
        } else if (!allMFCovered) {
          score -= 2500;
        }
      } else {
        score -= 900;
      }

      score -= (tracker.pairCount.get(keyA) || 0) * 1200;
      score -= (tracker.pairCount.get(keyB) || 0) * 1200;

      const fairness = combo.reduce((acc, p) => acc + (tracker.playCount.get(p.id) || 0), 0);
      score -= fairness * 25;

      score += Math.random() * 3;

      if (!best || score > best.score) {
        best = { teamA: a, teamB: b, score, chosen: combo };
      }
    }
  }

  return best;
}

function appendRound(
  players: Player[],
  courts: 1 | 2,
  round: number,
  tracker: TrackerState,
  maxMatchesInRound: number,
  preferredCourtOrder?: number[],
): Match[] {
  const roundMatches: Match[] = [];
  const usedThisRound = new Set<string>();
  const roundPairSet = new Set<string>();

  const defaultCourtOrder = Array.from({ length: courts }, (_, i) => i + 1);
  const courtOrder = preferredCourtOrder && preferredCourtOrder.length > 0
    ? preferredCourtOrder
    : defaultCourtOrder;

  for (const court of courtOrder) {
    if (roundMatches.length >= maxMatchesInRound) {
      break;
    }

    const available = players.filter((p) => !usedThisRound.has(p.id));
    if (available.length < 4) {
      continue;
    }

    let best = pickBestForCourt(available, tracker, true, true);
    if (!best) best = pickBestForCourt(available, tracker, true, false);
    if (!best) best = pickBestForCourt(available, tracker, false, true);
    if (!best) best = pickBestForCourt(available, tracker, false, false);

    if (!best) {
      continue;
    }

    const keyA = pairKey(best.teamA[0], best.teamA[1]);
    const keyB = pairKey(best.teamB[0], best.teamB[1]);

    tracker.pairCount.set(keyA, (tracker.pairCount.get(keyA) || 0) + 1);
    tracker.pairCount.set(keyB, (tracker.pairCount.get(keyB) || 0) + 1);

    if (isMixed(best.teamA)) tracker.mfCovered.add(keyA);
    if (isMixed(best.teamB)) tracker.mfCovered.add(keyB);

    for (const player of best.chosen) {
      tracker.playCount.set(player.id, (tracker.playCount.get(player.id) || 0) + 1);
      usedThisRound.add(player.id);
    }

    roundPairSet.add(keyA);
    roundPairSet.add(keyB);

    roundMatches.push({
      id: crypto.randomUUID(),
      round,
      court,
      teamA: { id: crypto.randomUUID(), players: [best.teamA[0], best.teamA[1]] },
      teamB: { id: crypto.randomUUID(), players: [best.teamB[0], best.teamB[1]] },
      scoreA: null,
      scoreB: null,
      winner: null,
    });
  }

  tracker.lastRoundPairs.clear();
  for (const key of roundPairSet) {
    tracker.lastRoundPairs.add(key);
  }

  return roundMatches;
}

function buildCourtOrder(courts: 1 | 2, matches: Match[]): number[] {
  const counts = new Map<number, number>();
  for (let court = 1; court <= courts; court++) {
    counts.set(court, 0);
  }
  for (const m of matches) {
    counts.set(m.court, (counts.get(m.court) || 0) + 1);
  }

  return Array.from({ length: courts }, (_, i) => i + 1).sort((a, b) => {
    const diff = (counts.get(a) || 0) - (counts.get(b) || 0);
    if (diff !== 0) return diff;
    return a - b;
  });
}

/**
 * Generate time-based schedule with proper mixed-gender pairing
 * - Each male-female pair plays at least once
 * - No consecutive same-pair partnerships
 */
export function generateTimeBasedSchedule(
  players: Player[],
  courts: 1 | 2,
  durationMinutes: number
): Match[] {
  const matches: Match[] = [];

  const maxMatchesTotal = Math.floor(durationMinutes / MINUTES_PER_MATCH);
  if (maxMatchesTotal <= 0 || players.length < 4) {
    return matches;
  }

  const tracker = initializeTracker(players, []);

  for (let round = 1; matches.length < maxMatchesTotal; round++) {
    const remaining = maxMatchesTotal - matches.length;
    const roundMatches = appendRound(players, courts, round, tracker, Math.min(courts, remaining));

    if (roundMatches.length === 0) {
      break;
    }

    matches.push(...roundMatches);
  }

  // Sort matches by round then court
  matches.sort((a, b) => {
    if (a.round !== b.round) return a.round - b.round;
    return a.court - b.court;
  });

  return matches;
}

/**
 * Add extra matches to an existing schedule without replacing it.
 * By default adds one match total.
 */
export function generateAdditionalMatches(
  players: Player[],
  courts: 1 | 2,
  existingMatches: Match[],
  count = 1,
): Match[] {
  if (count <= 0 || players.length < 4) {
    return [...existingMatches];
  }

  const tracker = initializeTracker(players, existingMatches);
  const merged: Match[] = [...existingMatches];

  let remaining = count;
  let nextRound = existingMatches.length > 0
    ? Math.max(...existingMatches.map((m) => m.round)) + 1
    : 1;

  while (remaining > 0) {
    const courtOrder = buildCourtOrder(courts, merged);
    const roundMatches = appendRound(
      players,
      courts,
      nextRound,
      tracker,
      Math.min(remaining, courtOrder.length),
      courtOrder,
    );

    if (roundMatches.length === 0) {
      break;
    }

    merged.push(...roundMatches);
    remaining -= roundMatches.length;
    nextRound += 1;
  }

  merged.sort((a, b) => {
    if (a.round !== b.round) return a.round - b.round;
    return a.court - b.court;
  });

  return merged;
}

/**
 * Legacy round-robin schedule (kept for compatibility)
 */
export function generateRoundRobinSchedule(
  teams: Team[],
  courts: 1 | 2,
): Match[] {
  const matches: Match[] = [];
  const teamCount = teams.length;
  
  const teamIndices = teams.map((_, i) => i);
  const totalRounds = teamCount - 1;
  
  for (let round = 0; round < totalRounds; round++) {
    const roundMatches: Match[] = [];
    
    const rotated = [...teamIndices.slice(1)];
    for (let i = round; i > 0; i--) {
      const temp = rotated[i];
      rotated[i] = rotated[i - 1];
      rotated[i - 1] = temp;
    }
    const orderedTeams = [teamIndices[0], ...rotated];
    
    const matchesThisRound = Math.min(courts, Math.floor(teamCount / 2));
    
    for (let m = 0; m < matchesThisRound; m++) {
      const teamAIndex = orderedTeams[m];
      const teamBIndex = orderedTeams[teamCount - 1 - m];
      
      if (teamAIndex !== undefined && teamBIndex !== undefined) {
        roundMatches.push({
          id: crypto.randomUUID(),
          round: round + 1,
          court: (m % courts) + 1,
          teamA: teams[teamAIndex],
          teamB: teams[teamBIndex],
          scoreA: null,
          scoreB: null,
          winner: null
        });
      }
    }
    
    matches.push(...roundMatches);
  }
  
  return matches;
}

/**
 * Group matches by court
 */
export function groupMatchesByCourt(matches: Match[]): Map<number, Match[]> {
  const grouped = new Map<number, Match[]>();
  
  for (const match of matches) {
    const existing = grouped.get(match.court) || [];
    existing.push(match);
    grouped.set(match.court, existing);
  }
  
  return grouped;
}

/**
 * Group matches by round
 */
export function groupMatchesByRound(matches: Match[]): Map<number, Match[]> {
  const grouped = new Map<number, Match[]>();
  
  for (const match of matches) {
    const existing = grouped.get(match.round) || [];
    existing.push(match);
    grouped.set(match.round, existing);
  }
  
  return grouped;
}

/**
 * Get total number of rounds
 */
export function getTotalRounds(matches: Match[]): number {
  if (matches.length === 0) return 0;
  return Math.max(...matches.map(m => m.round));
}

/**
 * Get matches for a specific round
 */
export function getMatchesForRound(matches: Match[], round: number): Match[] {
  return matches.filter(m => m.round === round);
}

/**
 * Get matches for a specific court
 */
export function getMatchesForCourt(matches: Match[], court: number): Match[] {
  return matches.filter(m => m.court === court);
}
