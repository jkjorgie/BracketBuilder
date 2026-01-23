// Core bracket types for the voting application

export interface Contestant {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  seed?: number;
}

export interface Matchup {
  id: string;
  contestant1: Contestant | null;
  contestant2: Contestant | null;
  winner?: Contestant | null;
  roundNumber: number;
  matchupIndex: number; // Position within the round (0-indexed)
}

export interface Round {
  roundNumber: number;
  name: string;
  matchups: Matchup[];
  isActive: boolean;
  isComplete: boolean;
  startDate?: string;
  endDate?: string;
}

export interface Bracket {
  id: string;
  name: string;
  description: string;
  rounds: Round[];
  currentRound: number;
  champion?: Contestant | null;
  createdAt: string;
  updatedAt: string;
}

export interface Vote {
  id: string;
  bracketId: string;
  matchupId: string;
  contestantId: string;
  source: string; // URL parameter tracking (e.g., "boothday1", "sessionx")
  submittedAt: string;
  userId?: string; // Optional for anonymous voting
}

export interface BracketSubmission {
  id: string;
  bracketId: string;
  roundNumber: number;
  votes: Vote[];
  source: string;
  submittedAt: string;
  email?: string;
  name?: string;
}

// Utility type for round names
export const ROUND_NAMES: Record<number, string> = {
  1: 'Quarterfinals',
  2: 'Semifinals',
  3: 'Finals',
  4: 'Championship',
};

export function getRoundName(roundNumber: number, totalRounds: number): string {
  const roundsFromEnd = totalRounds - roundNumber + 1;
  switch (roundsFromEnd) {
    case 1:
      return 'Championship';
    case 2:
      return 'Finals';
    case 3:
      return 'Semifinals';
    case 4:
      return 'Quarterfinals';
    default:
      return `Round ${roundNumber}`;
  }
}

export function getMatchupsPerRound(totalContestants: number, roundNumber: number): number {
  return totalContestants / Math.pow(2, roundNumber);
}
