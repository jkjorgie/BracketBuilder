import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { Prisma } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

type TransactionClient = Prisma.TransactionClient;

type RouteContext = {
  params: Promise<{ slug: string }>;
};

// POST /api/campaigns/[slug]/rounds - Initialize rounds for a campaign (admin only)
export async function POST(request: NextRequest, context: RouteContext) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const { slug } = await context.params;

    const campaign = await prisma.campaign.findUnique({
      where: { slug },
      include: { competitors: { orderBy: { seed: 'asc' } } },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const competitorCount = campaign.competitors.length;
    if (competitorCount < 2) {
      return NextResponse.json(
        { error: 'Need at least 2 competitors to create rounds' },
        { status: 400 }
      );
    }

    // Calculate number of rounds needed
    const numRounds = Math.ceil(Math.log2(competitorCount));
    
    // Round names based on number of rounds
    const getRoundName = (roundNum: number, totalRounds: number): string => {
      const fromEnd = totalRounds - roundNum + 1;
      switch (fromEnd) {
        case 1: return 'Championship';
        case 2: return 'Finals';
        case 3: return 'Semifinals';
        case 4: return 'Quarterfinals';
        default: return `Round ${roundNum}`;
      }
    };

    // Create rounds and matchups in a transaction
    const result = await prisma.$transaction(async (tx: TransactionClient) => {
      // Delete existing rounds and matchups
      await tx.matchup.deleteMany({ where: { campaignId: campaign.id } });
      await tx.round.deleteMany({ where: { campaignId: campaign.id } });

      const rounds = [];
      
      for (let i = 1; i <= numRounds; i++) {
        const matchupCount = competitorCount / Math.pow(2, i);
        
        const round = await tx.round.create({
          data: {
            roundNumber: i,
            name: getRoundName(i, numRounds),
            campaignId: campaign.id,
            isActive: i === 1, // First round is active
          },
        });

        // Create matchups for this round
        const matchups = [];
        for (let j = 0; j < matchupCount; j++) {
          // For round 1, assign competitors based on seeding
          // Traditional bracket seeding: 1v8, 4v5, 3v6, 2v7 for 8 teams
          let comp1Id = null;
          let comp2Id = null;

          if (i === 1) {
            // Calculate seeding pairs
            const totalMatchups = competitorCount / 2;
            const seedPairs = generateSeedPairs(competitorCount);
            if (seedPairs[j]) {
              const [seed1, seed2] = seedPairs[j];
              comp1Id = campaign.competitors.find((c: typeof campaign.competitors[number]) => c.seed === seed1)?.id || null;
              comp2Id = campaign.competitors.find((c: typeof campaign.competitors[number]) => c.seed === seed2)?.id || null;
            }
          }

          const matchup = await tx.matchup.create({
            data: {
              matchupIndex: j,
              roundId: round.id,
              campaignId: campaign.id,
              competitor1Id: comp1Id,
              competitor2Id: comp2Id,
            },
          });
          matchups.push(matchup);
        }

        rounds.push({ ...round, matchups });
      }

      return rounds;
    });

    await logAudit('ROUND_STARTED', 'Campaign', campaign.id, { rounds: result.length }, request);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating rounds:', error);
    return NextResponse.json(
      { error: 'Failed to create rounds' },
      { status: 500 }
    );
  }
}

// Generate seed pairs for bracket (1v8, 4v5, 3v6, 2v7 pattern)
function generateSeedPairs(count: number): [number, number][] {
  const pairs: [number, number][] = [];
  
  if (count === 2) {
    return [[1, 2]];
  }
  
  if (count === 4) {
    return [[1, 4], [2, 3]];
  }
  
  if (count === 8) {
    return [[1, 8], [4, 5], [3, 6], [2, 7]];
  }
  
  if (count === 16) {
    return [
      [1, 16], [8, 9], [4, 13], [5, 12],
      [3, 14], [6, 11], [2, 15], [7, 10],
    ];
  }
  
  // Fallback for other sizes
  for (let i = 0; i < count / 2; i++) {
    pairs.push([i + 1, count - i]);
  }
  
  return pairs;
}
