import type { Player, Team, Match, TournamentFormat } from '../types';

const MINUTES_PER_MATCH = 5;

export interface ScheduleOptions {
  format: TournamentFormat;
  teamSize: 'single' | 'double';
  pointsPerMatch?: number;
}

const DEFAULT_OPTIONS: ScheduleOptions = {
  format: 'round_robin',
  teamSize: 'double',
};

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

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

function newId(): string {
  return crypto.randomUUID();
}

function makeMatch(
  round: number,
  court: number,
  teamA: Player[],
  teamB: Player[],
): Match {
  return {
    id: newId(),
    round,
    court,
    teamA: { id: newId(), players: teamA },
    teamB: { id: newId(), players: teamB },
    scoreA: null,
    scoreB: null,
    winner: null,
  };
}

/**
 * Sum the scoreA / scoreB of each match per player based on team membership.
 * Null scores contribute 0.
 */
export function computePlayerPoints(matches: Match[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const m of matches) {
    const a = m.scoreA ?? 0;
    const b = m.scoreB ?? 0;
    for (const p of m.teamA.players) {
      out.set(p.id, (out.get(p.id) || 0) + a);
    }
    for (const p of m.teamB.players) {
      out.set(p.id, (out.get(p.id) || 0) + b);
    }
  }
  return out;
}

/**
 * Count the number of matches each player has appeared in.
 */
export function computePlayerPlayCount(matches: Match[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const m of matches) {
    for (const p of [...m.teamA.players, ...m.teamB.players]) {
      out.set(p.id, (out.get(p.id) || 0) + 1);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Legacy doubles round-robin (mixed-gender aware) — unchanged behavior
// ---------------------------------------------------------------------------

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
    if (m.teamA.players.length < 2 || m.teamB.players.length < 2) {
      // Singles match — only update playCount.
      for (const p of [...m.teamA.players, ...m.teamB.players]) {
        playCount.set(p.id, (playCount.get(p.id) || 0) + 1);
      }
      continue;
    }
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
      if (m.teamA.players.length >= 2 && m.teamB.players.length >= 2) {
        lastRoundPairs.add(pairKey(m.teamA.players[0], m.teamA.players[1]));
        lastRoundPairs.add(pairKey(m.teamB.players[0], m.teamB.players[1]));
      }
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

    roundMatches.push(
      makeMatch(round, court, [best.teamA[0], best.teamA[1]], [best.teamB[0], best.teamB[1]]),
    );
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

function generateRoundRobinDoublesSchedule(
  players: Player[],
  courts: 1 | 2,
  durationMinutes: number,
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

  matches.sort((a, b) => {
    if (a.round !== b.round) return a.round - b.round;
    return a.court - b.court;
  });

  return matches;
}

function appendRoundRobinDoubles(
  players: Player[],
  courts: 1 | 2,
  existingMatches: Match[],
  count: number,
): Match[] {
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

  return merged;
}

// ---------------------------------------------------------------------------
// Americano — doubles
// ---------------------------------------------------------------------------

interface AmericanoDoublesContext {
  partnerCount: Map<string, number>; // pairKey -> times partnered
  opponentCount: Map<string, number>; // pairKey -> times opposed
  playCount: Map<string, number>;
  sitOutCount: Map<string, number>;
  lastSatOutRound: Map<string, number>;
}

function createAmericanoContext(players: Player[], existing: Match[]): AmericanoDoublesContext {
  const ctx: AmericanoDoublesContext = {
    partnerCount: new Map(),
    opponentCount: new Map(),
    playCount: new Map(),
    sitOutCount: new Map(),
    lastSatOutRound: new Map(),
  };
  players.forEach((p) => {
    ctx.playCount.set(p.id, 0);
    ctx.sitOutCount.set(p.id, 0);
  });
  applyMatchesToAmericanoContext(ctx, existing, players);
  return ctx;
}

function applyMatchesToAmericanoContext(
  ctx: AmericanoDoublesContext,
  matches: Match[],
  players: Player[],
): void {
  if (matches.length === 0) return;
  const byRound = new Map<number, Match[]>();
  for (const m of matches) {
    const arr = byRound.get(m.round) || [];
    arr.push(m);
    byRound.set(m.round, arr);
  }

  for (const [round, roundMatches] of byRound) {
    const playing = new Set<string>();
    for (const m of roundMatches) {
      const a = m.teamA.players;
      const b = m.teamB.players;
      if (a.length >= 2) {
        const key = pairKey(a[0], a[1]);
        ctx.partnerCount.set(key, (ctx.partnerCount.get(key) || 0) + 1);
      }
      if (b.length >= 2) {
        const key = pairKey(b[0], b[1]);
        ctx.partnerCount.set(key, (ctx.partnerCount.get(key) || 0) + 1);
      }
      // opponentCount: every cross-team pair
      for (const pa of a) {
        for (const pb of b) {
          const key = pairKey(pa, pb);
          ctx.opponentCount.set(key, (ctx.opponentCount.get(key) || 0) + 1);
        }
      }
      for (const p of [...a, ...b]) {
        ctx.playCount.set(p.id, (ctx.playCount.get(p.id) || 0) + 1);
        playing.add(p.id);
      }
    }
    for (const p of players) {
      if (!playing.has(p.id)) {
        ctx.sitOutCount.set(p.id, (ctx.sitOutCount.get(p.id) || 0) + 1);
        ctx.lastSatOutRound.set(p.id, round);
      }
    }
  }
}

/**
 * Build a single Americano-doubles round.
 * Uses repeated random sampling: tries up to ATTEMPTS distinct random permutations
 * of the playing-pool ordering / grouping, then picks the one with the smallest
 * total partner-repeat cost (preferring zero repeats).
 */
function buildAmericanoDoublesRound(
  players: Player[],
  courts: 1 | 2,
  round: number,
  ctx: AmericanoDoublesContext,
): Match[] {
  const playersPerRound = courts * 4;
  if (players.length < 4) return [];

  // Pick who plays this round. Prefer those with fewer playCount, then those who sat out longer ago.
  const eligibleSorted = shuffleArray([...players]).sort((a, b) => {
    const pa = ctx.playCount.get(a.id) || 0;
    const pb = ctx.playCount.get(b.id) || 0;
    if (pa !== pb) return pa - pb;
    const sa = ctx.sitOutCount.get(a.id) || 0;
    const sb = ctx.sitOutCount.get(b.id) || 0;
    if (sa !== sb) return sb - sa;
    return a.name.localeCompare(b.name);
  });

  const slots = Math.min(playersPerRound, players.length);
  const usable = Math.floor(slots / 4) * 4;
  if (usable < 4) return [];

  // The first `usable` players from the sorted order definitely play. We may
  // permute their assignment into groups across attempts.
  const playingPool = eligibleSorted.slice(0, usable);
  const sittingOut = players.filter((p) => !playingPool.includes(p));

  const ATTEMPTS = 80;
  type Plan = {
    matches: { court: number; teamA: [Player, Player]; teamB: [Player, Player] }[];
    cost: number;
  };
  let bestPlan: Plan | null = null;

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const order = attempt === 0 ? playingPool : shuffleArray(playingPool);
    const plan: Plan = { matches: [], cost: 0 };
    let valid = true;

    for (let g = 0; g < order.length / 4; g++) {
      const group = order.slice(g * 4, g * 4 + 4);
      const pairings = pairingsOf4(group);
      let chosen: { teamA: [Player, Player]; teamB: [Player, Player]; cost: number } | null = null;
      for (const [a, b] of pairings) {
        const keyA = pairKey(a[0], a[1]);
        const keyB = pairKey(b[0], b[1]);
        const partnerCost =
          (ctx.partnerCount.get(keyA) || 0) + (ctx.partnerCount.get(keyB) || 0);
        let opponentCost = 0;
        for (const pa of a) {
          for (const pb of b) {
            opponentCost += ctx.opponentCount.get(pairKey(pa, pb)) || 0;
          }
        }
        const cost = partnerCost * 1000 + opponentCost;
        if (!chosen || cost < chosen.cost) {
          chosen = { teamA: a, teamB: b, cost };
        }
      }
      if (!chosen) {
        valid = false;
        break;
      }
      plan.matches.push({ court: (g % courts) + 1, teamA: chosen.teamA, teamB: chosen.teamB });
      plan.cost += chosen.cost;
    }

    if (!valid) continue;

    if (!bestPlan || plan.cost < bestPlan.cost) {
      bestPlan = plan;
      if (bestPlan.cost === 0) break;
    }
  }

  if (!bestPlan) return [];

  const matches: Match[] = [];
  for (const m of bestPlan.matches) {
    matches.push(makeMatch(round, m.court, [m.teamA[0], m.teamA[1]], [m.teamB[0], m.teamB[1]]));
    const keyA = pairKey(m.teamA[0], m.teamA[1]);
    const keyB = pairKey(m.teamB[0], m.teamB[1]);
    ctx.partnerCount.set(keyA, (ctx.partnerCount.get(keyA) || 0) + 1);
    ctx.partnerCount.set(keyB, (ctx.partnerCount.get(keyB) || 0) + 1);
    for (const pa of m.teamA) {
      for (const pb of m.teamB) {
        const k = pairKey(pa, pb);
        ctx.opponentCount.set(k, (ctx.opponentCount.get(k) || 0) + 1);
      }
    }
    for (const p of [...m.teamA, ...m.teamB]) {
      ctx.playCount.set(p.id, (ctx.playCount.get(p.id) || 0) + 1);
    }
  }

  for (const p of sittingOut) {
    ctx.sitOutCount.set(p.id, (ctx.sitOutCount.get(p.id) || 0) + 1);
    ctx.lastSatOutRound.set(p.id, round);
  }

  return matches;
}

function maxAmericanoRounds(playerCount: number): number {
  // Number of partnerships = C(N,2). Each round consumes (N - sitOut)/2 partnerships,
  // capped roughly at N-1 (round-robin partnership target). We also bound to a generous upper limit.
  if (playerCount < 4) return 0;
  return playerCount - 1;
}

function generateAmericanoDoublesSchedule(
  players: Player[],
  courts: 1 | 2,
  durationMinutes: number,
): Match[] {
  const maxMatchesTotal = Math.floor(durationMinutes / MINUTES_PER_MATCH);
  if (maxMatchesTotal <= 0 || players.length < 4) return [];

  const ctx = createAmericanoContext(players, []);
  const matches: Match[] = [];
  const roundCap = maxAmericanoRounds(players.length);

  for (let round = 1; matches.length < maxMatchesTotal && round <= roundCap; round++) {
    const remaining = maxMatchesTotal - matches.length;
    const roundMatches = buildAmericanoDoublesRound(players, courts, round, ctx);
    if (roundMatches.length === 0) break;
    // If the round would exceed the duration cap, only take the first `remaining`
    matches.push(...roundMatches.slice(0, remaining));
  }

  matches.sort((a, b) => (a.round - b.round) || (a.court - b.court));
  return matches;
}

function appendAmericanoDoubles(
  players: Player[],
  courts: 1 | 2,
  existingMatches: Match[],
  count: number,
): Match[] {
  const ctx = createAmericanoContext(players, existingMatches);
  const merged: Match[] = [...existingMatches];
  let nextRound = existingMatches.length > 0
    ? Math.max(...existingMatches.map((m) => m.round)) + 1
    : 1;

  let added = 0;
  while (added < count) {
    const roundMatches = buildAmericanoDoublesRound(players, courts, nextRound, ctx);
    if (roundMatches.length === 0) break;
    const remaining = count - added;
    const take = roundMatches.slice(0, remaining);
    merged.push(...take);
    added += take.length;
    nextRound += 1;
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Mexicano — doubles (lazy, results-driven)
// ---------------------------------------------------------------------------

function buildMexicanoDoublesRound(
  players: Player[],
  courts: 1 | 2,
  round: number,
  existingMatches: Match[],
): Match[] {
  if (players.length < 4) return [];

  const points = computePlayerPoints(existingMatches);
  const playCounts = computePlayerPlayCount(existingMatches);

  const ranked = [...players].sort((a, b) => {
    const pa = points.get(a.id) || 0;
    const pb = points.get(b.id) || 0;
    if (pa !== pb) return pb - pa;
    const ca = playCounts.get(a.id) || 0;
    const cb = playCounts.get(b.id) || 0;
    if (ca !== cb) return ca - cb;
    return a.name.localeCompare(b.name);
  });

  const matches: Match[] = [];
  const maxCourts = Math.min(courts, Math.floor(ranked.length / 4));
  for (let c = 0; c < maxCourts; c++) {
    const group = ranked.slice(c * 4, c * 4 + 4);
    if (group.length < 4) break;
    // [a,b,c,d]: top + bottom vs middle two => [a,d] vs [b,c]
    const [a, b, cP, d] = group;
    matches.push(makeMatch(round, c + 1, [a, d], [b, cP]));
  }

  return matches;
}

function generateMexicanoDoublesSchedule(
  players: Player[],
  courts: 1 | 2,
  durationMinutes: number,
): Match[] {
  // Mexicano is lazy: only round 1 is generated up-front. We still respect
  // the duration cap (zero-budget => no matches).
  if (durationMinutes < MINUTES_PER_MATCH) return [];
  // Round 1 = play-count balanced random pairing (no mixed-gender constraint).
  if (players.length < 4) return [];
  const tracker = initializeTracker(players, []);
  const matches = appendRound(players, courts, 1, tracker, courts);
  matches.sort((a, b) => (a.round - b.round) || (a.court - b.court));
  return matches;
}

function appendMexicanoDoubles(
  players: Player[],
  courts: 1 | 2,
  existingMatches: Match[],
  count: number,
): Match[] {
  if (players.length < 4) return [...existingMatches];

  const merged: Match[] = [...existingMatches];
  let nextRound = existingMatches.length > 0
    ? Math.max(...existingMatches.map((m) => m.round)) + 1
    : 1;

  for (let i = 0; i < count; i++) {
    // Mexicano re-pairs by current standings. If the most recent round has no
    // recorded scores, regenerating would produce an identical pairing because
    // the ranking hasn't moved. Refuse to batch in that case — callers should
    // record scores between rounds (the App's "Add Match" flow uses count=1).
    if (i > 0 && hasUnscoredLatestRound(merged)) break;

    const roundMatches = buildMexicanoDoublesRound(players, courts, nextRound, merged);
    if (roundMatches.length === 0) break;
    merged.push(...roundMatches);
    nextRound += 1;
  }
  return merged;
}

function hasUnscoredLatestRound(matches: Match[]): boolean {
  if (matches.length === 0) return false;
  const latest = Math.max(...matches.map((m) => m.round));
  return matches
    .filter((m) => m.round === latest)
    .every((m) => m.scoreA === null && m.scoreB === null);
}

// ---------------------------------------------------------------------------
// Singles algorithms (1v1)
// ---------------------------------------------------------------------------

interface SinglesContext {
  playCount: Map<string, number>;
  opponentCount: Map<string, number>;
  lastRoundOpponents: Set<string>;
}

function createSinglesContext(players: Player[], existing: Match[]): SinglesContext {
  const ctx: SinglesContext = {
    playCount: new Map(),
    opponentCount: new Map(),
    lastRoundOpponents: new Set(),
  };
  players.forEach((p) => ctx.playCount.set(p.id, 0));

  for (const m of existing) {
    const a = m.teamA.players[0];
    const b = m.teamB.players[0];
    if (!a || !b) continue;
    ctx.playCount.set(a.id, (ctx.playCount.get(a.id) || 0) + 1);
    ctx.playCount.set(b.id, (ctx.playCount.get(b.id) || 0) + 1);
    const key = pairKey(a, b);
    ctx.opponentCount.set(key, (ctx.opponentCount.get(key) || 0) + 1);
  }

  if (existing.length > 0) {
    const lastRound = Math.max(...existing.map((m) => m.round));
    for (const m of existing) {
      if (m.round !== lastRound) continue;
      const a = m.teamA.players[0];
      const b = m.teamB.players[0];
      if (a && b) ctx.lastRoundOpponents.add(pairKey(a, b));
    }
  }
  return ctx;
}

interface SinglesRoundOptions {
  avoidImmediateRematch: boolean;
  pairingStrategy: 'balanced' | 'mexicano';
  pointsByPlayer?: Map<string, number>;
}

/**
 * Build one singles round. Pairs across courts using the chosen strategy.
 */
function generateSinglesRound(
  players: Player[],
  courts: 1 | 2,
  round: number,
  ctx: SinglesContext,
  opts: SinglesRoundOptions,
): Match[] {
  if (players.length < 2) return [];

  let ranked: Player[];
  if (opts.pairingStrategy === 'mexicano') {
    const points = opts.pointsByPlayer ?? new Map<string, number>();
    ranked = [...players].sort((a, b) => {
      const pa = points.get(a.id) || 0;
      const pb = points.get(b.id) || 0;
      if (pa !== pb) return pb - pa;
      const ca = ctx.playCount.get(a.id) || 0;
      const cb = ctx.playCount.get(b.id) || 0;
      if (ca !== cb) return ca - cb;
      return a.name.localeCompare(b.name);
    });
  } else {
    // Balanced: lowest play count first, then random/name.
    ranked = shuffleArray([...players]).sort((a, b) => {
      const pa = ctx.playCount.get(a.id) || 0;
      const pb = ctx.playCount.get(b.id) || 0;
      if (pa !== pb) return pa - pb;
      return a.name.localeCompare(b.name);
    });
  }

  const matches: Match[] = [];
  const used = new Set<string>();
  const maxMatches = Math.min(courts, Math.floor(ranked.length / 2));

  for (let i = 0; i < ranked.length && matches.length < maxMatches; i++) {
    const a = ranked[i];
    if (used.has(a.id)) continue;

    // Find best partner for a from remaining ranked list.
    let chosenIdx = -1;
    let chosenScore = Infinity;
    for (let j = i + 1; j < ranked.length; j++) {
      const b = ranked[j];
      if (used.has(b.id)) continue;
      const key = pairKey(a, b);
      let score = (ctx.opponentCount.get(key) || 0) * 100;
      if (opts.avoidImmediateRematch && ctx.lastRoundOpponents.has(key)) {
        score += 1000;
      }
      // Prefer "natural" adjacency: closer in ranked order is cheaper.
      score += (j - i);
      if (score < chosenScore) {
        chosenScore = score;
        chosenIdx = j;
      }
    }

    if (chosenIdx === -1) continue;
    const b = ranked[chosenIdx];
    used.add(a.id);
    used.add(b.id);
    const court = matches.length + 1;
    matches.push(makeMatch(round, court, [a], [b]));
    ctx.playCount.set(a.id, (ctx.playCount.get(a.id) || 0) + 1);
    ctx.playCount.set(b.id, (ctx.playCount.get(b.id) || 0) + 1);
    const key = pairKey(a, b);
    ctx.opponentCount.set(key, (ctx.opponentCount.get(key) || 0) + 1);
  }

  ctx.lastRoundOpponents = new Set(matches.map((m) => pairKey(m.teamA.players[0], m.teamB.players[0])));
  return matches;
}

function generateSinglesSchedule(
  players: Player[],
  courts: 1 | 2,
  durationMinutes: number,
  format: TournamentFormat,
): Match[] {
  const maxMatchesTotal = Math.floor(durationMinutes / MINUTES_PER_MATCH);
  if (maxMatchesTotal <= 0 || players.length < 2) return [];

  if (format === 'mexicano') {
    // Lazy: only round 1.
    const ctx = createSinglesContext(players, []);
    const round1 = generateSinglesRound(players, courts, 1, ctx, {
      avoidImmediateRematch: false,
      pairingStrategy: 'balanced',
    });
    return round1.slice(0, maxMatchesTotal);
  }

  // round_robin & americano singles share the same generation here:
  // both fill rounds, balancing play count and avoiding immediate rematches.
  // Americano caps the number of rounds at N-1 (every player has met every other once).
  const ctx = createSinglesContext(players, []);
  const matches: Match[] = [];
  const roundCap = format === 'americano' ? players.length - 1 : Number.POSITIVE_INFINITY;

  for (let round = 1; matches.length < maxMatchesTotal && round <= roundCap; round++) {
    const roundMatches = generateSinglesRound(players, courts, round, ctx, {
      avoidImmediateRematch: true,
      pairingStrategy: 'balanced',
    });
    if (roundMatches.length === 0) break;
    const remaining = maxMatchesTotal - matches.length;
    matches.push(...roundMatches.slice(0, remaining));
  }
  return matches;
}

function appendSinglesMatches(
  players: Player[],
  courts: 1 | 2,
  existingMatches: Match[],
  count: number,
  format: TournamentFormat,
): Match[] {
  const merged: Match[] = [...existingMatches];
  let nextRound = existingMatches.length > 0
    ? Math.max(...existingMatches.map((m) => m.round)) + 1
    : 1;

  let added = 0;
  while (added < count) {
    // Mexicano singles re-pairs by current standings — same protection as
    // doubles: don't batch additional rounds when the latest is unscored.
    if (added > 0 && format === 'mexicano' && hasUnscoredLatestRound(merged)) break;

    const ctx = createSinglesContext(players, merged);
    const opts: SinglesRoundOptions =
      format === 'mexicano'
        ? {
            avoidImmediateRematch: false,
            pairingStrategy: 'mexicano',
            pointsByPlayer: computePlayerPoints(merged),
          }
        : {
            avoidImmediateRematch: true,
            pairingStrategy: 'balanced',
          };
    const roundMatches = generateSinglesRound(players, courts, nextRound, ctx, opts);
    if (roundMatches.length === 0) break;
    const take = roundMatches.slice(0, count - added);
    merged.push(...take);
    added += take.length;
    nextRound += 1;
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Public dispatchers
// ---------------------------------------------------------------------------

/**
 * Generate the initial schedule. Behavior depends on `options.format` and `options.teamSize`.
 * Defaults to round-robin doubles to preserve legacy behavior.
 */
export function generateTimeBasedSchedule(
  players: Player[],
  courts: 1 | 2,
  durationMinutes: number,
  options?: ScheduleOptions,
): Match[] {
  const opts = options ?? DEFAULT_OPTIONS;

  if (opts.teamSize === 'single') {
    return generateSinglesSchedule(players, courts, durationMinutes, opts.format);
  }

  switch (opts.format) {
    case 'americano':
      return generateAmericanoDoublesSchedule(players, courts, durationMinutes);
    case 'mexicano':
      return generateMexicanoDoublesSchedule(players, courts, durationMinutes);
    case 'round_robin':
    default:
      return generateRoundRobinDoublesSchedule(players, courts, durationMinutes);
  }
}

/**
 * Append `count` matches (typically one round) to an existing schedule.
 * Behavior depends on `options.format` and `options.teamSize`.
 */
export function generateAdditionalMatches(
  players: Player[],
  courts: 1 | 2,
  existingMatches: Match[],
  count = 1,
  options?: ScheduleOptions,
): Match[] {
  if (count <= 0) return [...existingMatches];
  const opts = options ?? DEFAULT_OPTIONS;

  if (opts.teamSize === 'single') {
    if (players.length < 2) return [...existingMatches];
    const result = appendSinglesMatches(players, courts, existingMatches, count, opts.format);
    result.sort((a, b) => (a.round - b.round) || (a.court - b.court));
    return result;
  }

  if (players.length < 4) return [...existingMatches];

  let result: Match[];
  switch (opts.format) {
    case 'americano':
      result = appendAmericanoDoubles(players, courts, existingMatches, count);
      break;
    case 'mexicano':
      result = appendMexicanoDoubles(players, courts, existingMatches, count);
      break;
    case 'round_robin':
    default:
      result = appendRoundRobinDoubles(players, courts, existingMatches, count);
      break;
  }
  result.sort((a, b) => (a.round - b.round) || (a.court - b.court));
  return result;
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
          id: newId(),
          round: round + 1,
          court: (m % courts) + 1,
          teamA: teams[teamAIndex],
          teamB: teams[teamBIndex],
          scoreA: null,
          scoreB: null,
          winner: null,
        });
      }
    }

    matches.push(...roundMatches);
  }

  return matches;
}

// ---------------------------------------------------------------------------
// Grouping helpers (unchanged)
// ---------------------------------------------------------------------------

export function groupMatchesByCourt(matches: Match[]): Map<number, Match[]> {
  const grouped = new Map<number, Match[]>();
  for (const match of matches) {
    const existing = grouped.get(match.court) || [];
    existing.push(match);
    grouped.set(match.court, existing);
  }
  return grouped;
}

export function groupMatchesByRound(matches: Match[]): Map<number, Match[]> {
  const grouped = new Map<number, Match[]>();
  for (const match of matches) {
    const existing = grouped.get(match.round) || [];
    existing.push(match);
    grouped.set(match.round, existing);
  }
  return grouped;
}

export function getTotalRounds(matches: Match[]): number {
  if (matches.length === 0) return 0;
  return Math.max(...matches.map((m) => m.round));
}

export function getMatchesForRound(matches: Match[], round: number): Match[] {
  return matches.filter((m) => m.round === round);
}

export function getMatchesForCourt(matches: Match[], court: number): Match[] {
  return matches.filter((m) => m.court === court);
}
