import type { Player, Team } from '../types';

/**
 * Fisher-Yates shuffle algorithm
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Group players by gender
 */
function groupByGender(players: Player[]): { males: Player[]; females: Player[] } {
  return {
    males: players.filter(p => p.gender === 'm'),
    females: players.filter(p => p.gender === 'f')
  };
}

/**
 * Create balanced teams from participants
 * PRIORITIZES mixed-gender teams
 * 
 * For doubles: pairs players together
 * For singles: each player is their own team
 */
export function generateTeams(players: Player[], teamSize: 'single' | 'double'): Team[] {
  if (teamSize === 'single') {
    return players.map(player => ({
      id: crypto.randomUUID(),
      players: [player]
    }));
  }
  
  // Double teams - ensure mixed gender when possible
  const { males, females } = groupByGender(players);
  const teams: Team[] = [];
  
  // Shuffle both groups
  const shuffledMales = shuffleArray(males);
  const shuffledFemales = shuffleArray(females);
  
  const femaleCount = shuffledFemales.length;
  const maleCount = shuffledMales.length;
  
  // Create pairs ensuring MIXED GENDER teams
  const pairs: [Player, Player][] = [];
  
  // If we have both genders, create only mixed pairs
  if (femaleCount > 0 && maleCount > 0) {
    // Sort to pair first female with last male, etc. for balance
    const sortedFemales = [...shuffledFemales].sort((a, b) => a.name.localeCompare(b.name));
    const sortedMales = [...shuffledMales].sort((a, b) => b.name.localeCompare(a.name)); // reversed for pairing
    
    // Number of mixed pairs = min(males, females)
    const mixedPairCount = Math.min(femaleCount, maleCount);
    
    for (let i = 0; i < mixedPairCount; i++) {
      pairs.push([sortedFemales[i], sortedMales[i]]);
    }
    
    // If one gender has more, create additional pairs from the same gender
    // These players will be paired with each other
    const remainingFemales = femaleCount - mixedPairCount;
    const remainingMales = maleCount - mixedPairCount;
    
    // Pair remaining females together
    for (let i = 0; i < remainingFemales; i += 2) {
      if (i + 1 < remainingFemales) {
        pairs.push([sortedFemales[mixedPairCount + i], sortedFemales[mixedPairCount + i + 1]]);
      }
    }
    
    // Pair remaining males together
    for (let i = 0; i < remainingMales; i += 2) {
      if (i + 1 < remainingMales) {
        pairs.push([sortedMales[mixedPairCount + i], sortedMales[mixedPairCount + i + 1]]);
      }
    }
  } else {
    // Only one gender available - create same-gender pairs
    const allPlayers = [...shuffledMales, ...shuffledFemales];
    for (let i = 0; i < allPlayers.length; i += 2) {
      if (i + 1 < allPlayers.length) {
        pairs.push([allPlayers[i], allPlayers[i + 1]]);
      }
    }
  }
  
  // Shuffle the pairs for randomness
  const shuffledPairs = shuffleArray(pairs);
  
  // Create teams from pairs
  for (const pair of shuffledPairs) {
    teams.push({
      id: crypto.randomUUID(),
      players: pair
    });
  }
  
  return teams;
}

/**
 * Check if a team is mixed gender
 */
export function isMixedTeam(team: Team): boolean {
  if (team.players.length < 2) return false;
  const genders = new Set(team.players.map(p => p.gender));
  return genders.size > 1;
}

/**
 * Get team display names
 */
export function getTeamDisplayName(team: Team): string {
  return team.players.map(p => p.name).join(' & ');
}
