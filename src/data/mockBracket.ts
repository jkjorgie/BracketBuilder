import { Bracket, Contestant, Matchup, Round } from '@/types/bracket';

// Mock contestants - Product features for voting
export const mockContestants: Contestant[] = [
  {
    id: 'feature-1',
    name: 'Dark Mode',
    description: 'System-wide dark theme support for reduced eye strain and better battery life on OLED screens.',
    seed: 1,
  },
  {
    id: 'feature-2',
    name: 'AI Assistant',
    description: 'Intelligent AI-powered assistant to help users navigate and complete tasks more efficiently.',
    seed: 8,
  },
  {
    id: 'feature-3',
    name: 'Offline Mode',
    description: 'Full offline functionality allowing users to work without an internet connection.',
    seed: 4,
  },
  {
    id: 'feature-4',
    name: 'Custom Dashboards',
    description: 'Personalized dashboard builder with drag-and-drop widgets and customizable layouts.',
    seed: 5,
  },
  {
    id: 'feature-5',
    name: 'Real-time Collaboration',
    description: 'Live collaboration features enabling multiple users to work on the same document simultaneously.',
    seed: 3,
  },
  {
    id: 'feature-6',
    name: 'Advanced Analytics',
    description: 'Comprehensive analytics dashboard with predictive insights and custom reporting.',
    seed: 6,
  },
  {
    id: 'feature-7',
    name: 'Mobile App',
    description: 'Native mobile application for iOS and Android with full feature parity.',
    seed: 2,
  },
  {
    id: 'feature-8',
    name: 'API Integrations',
    description: 'Extensive third-party API integrations with popular tools and services.',
    seed: 7,
  },
];

// Helper to create matchups for round 1 (8 contestants = 4 matchups)
function createRound1Matchups(contestants: Contestant[]): Matchup[] {
  // Traditional bracket seeding: 1v8, 4v5, 3v6, 2v7
  const seedPairs = [
    [1, 8],
    [4, 5],
    [3, 6],
    [2, 7],
  ];

  return seedPairs.map((pair, index) => {
    const c1 = contestants.find((c) => c.seed === pair[0])!;
    const c2 = contestants.find((c) => c.seed === pair[1])!;
    return {
      id: `round1-match${index + 1}`,
      contestant1: c1,
      contestant2: c2,
      winner: null,
      roundNumber: 1,
      matchupIndex: index,
    };
  });
}

// Create empty matchups for future rounds
function createEmptyMatchups(roundNumber: number, count: number): Matchup[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `round${roundNumber}-match${index + 1}`,
    contestant1: null,
    contestant2: null,
    winner: null,
    roundNumber,
    matchupIndex: index,
  }));
}

// Create the full bracket structure
export function createMockBracket(): Bracket {
  const rounds: Round[] = [
    {
      roundNumber: 1,
      name: 'Quarterfinals',
      matchups: createRound1Matchups(mockContestants),
      isActive: true,
      isComplete: false,
      startDate: '2026-01-22',
      endDate: '2026-01-22',
    },
    {
      roundNumber: 2,
      name: 'Semifinals',
      matchups: createEmptyMatchups(2, 2),
      isActive: false,
      isComplete: false,
      startDate: '2026-01-23',
      endDate: '2026-01-23',
    },
    {
      roundNumber: 3,
      name: 'Finals',
      matchups: createEmptyMatchups(3, 1),
      isActive: false,
      isComplete: false,
      startDate: '2026-01-24',
      endDate: '2026-01-24',
    },
  ];

  return {
    id: 'bracket-2026-features',
    name: 'GT eForms Feature Face Off',
    description:
      'Help us decide which GT eForms feature to build next! Vote for your favorites at Alliance 2026.',
    rounds,
    currentRound: 1,
    champion: null,
    createdAt: '2026-01-20T00:00:00Z',
    updatedAt: '2026-01-22T00:00:00Z',
  };
}

// Export a singleton instance for use throughout the app
export const mockBracket = createMockBracket();
