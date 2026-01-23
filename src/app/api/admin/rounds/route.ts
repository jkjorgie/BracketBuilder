import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logAudit } from '@/lib/audit';

// Middleware to check admin session
async function checkAdminSession(request: NextRequest) {
  const sessionToken = request.cookies.get('session_token')?.value;
  if (!sessionToken) return null;

  const session = await prisma.session.findUnique({
    where: { token: sessionToken },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date() || !session.user.isActive) {
    return null;
  }

  return session.user;
}

// PUT /api/admin/rounds - Update a round
export async function PUT(request: NextRequest) {
  try {
    const user = await checkAdminSession(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, isActive, isComplete, startDate, endDate } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Get the round's campaign
    const existingRound = await prisma.round.findUnique({
      where: { id },
      include: { campaign: true },
    });

    if (!existingRound) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    // If activating this round, deactivate all others in the campaign
    if (isActive === true) {
      await prisma.round.updateMany({
        where: { 
          campaignId: existingRound.campaignId,
          id: { not: id },
        },
        data: { isActive: false },
      });

      // Update campaign's current round
      await prisma.campaign.update({
        where: { id: existingRound.campaignId },
        data: { currentRound: existingRound.roundNumber },
      });
    }

    const round = await prisma.round.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(isActive !== undefined && { isActive }),
        ...(isComplete !== undefined && { isComplete }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      },
      include: {
        matchups: {
          orderBy: { matchupIndex: 'asc' },
          include: {
            competitor1: true,
            competitor2: true,
            winner: true,
          },
        },
      },
    });

    await logAudit('ROUND_COMPLETED', 'Round', round.id, {
      updates: body,
      userId: user.id,
    });

    return NextResponse.json({ round });
  } catch (error) {
    console.error('Error updating round:', error);
    return NextResponse.json(
      { error: 'Failed to update round' },
      { status: 500 }
    );
  }
}

// POST /api/admin/rounds - Create rounds for a campaign
export async function POST(request: NextRequest) {
  try {
    const user = await checkAdminSession(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { campaignId, rounds } = body;

    if (!campaignId || !rounds || !Array.isArray(rounds)) {
      return NextResponse.json(
        { error: 'campaignId and rounds array are required' },
        { status: 400 }
      );
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { competitors: { orderBy: { seed: 'asc' } } },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const createdRounds = [];

    for (const roundData of rounds) {
      const round = await prisma.round.create({
        data: {
          roundNumber: roundData.roundNumber,
          name: roundData.name,
          campaignId,
          isActive: roundData.isActive ?? false,
          isComplete: false,
          startDate: roundData.startDate ? new Date(roundData.startDate) : null,
          endDate: roundData.endDate ? new Date(roundData.endDate) : null,
        },
      });

      // Create matchups for round 1 with competitors
      if (roundData.roundNumber === 1 && campaign.competitors.length >= 2) {
        const numMatchups = Math.floor(campaign.competitors.length / 2);
        const seedPairs = generateBracketPairs(campaign.competitors.length);

        for (let i = 0; i < numMatchups; i++) {
          const [seed1, seed2] = seedPairs[i] || [null, null];
          const comp1 = campaign.competitors.find((c: { seed: number | null }) => c.seed === seed1);
          const comp2 = campaign.competitors.find((c: { seed: number | null }) => c.seed === seed2);

          await prisma.matchup.create({
            data: {
              matchupIndex: i,
              roundId: round.id,
              campaignId,
              competitor1Id: comp1?.id || null,
              competitor2Id: comp2?.id || null,
            },
          });
        }
      } else {
        // Create empty matchups for later rounds
        const numMatchups = Math.pow(2, rounds.length - roundData.roundNumber);
        for (let i = 0; i < numMatchups; i++) {
          await prisma.matchup.create({
            data: {
              matchupIndex: i,
              roundId: round.id,
              campaignId,
              competitor1Id: null,
              competitor2Id: null,
            },
          });
        }
      }

      createdRounds.push(round);
    }

    return NextResponse.json({ rounds: createdRounds }, { status: 201 });
  } catch (error) {
    console.error('Error creating rounds:', error);
    return NextResponse.json(
      { error: 'Failed to create rounds' },
      { status: 500 }
    );
  }
}

// Generate bracket pairings (1v8, 4v5, 3v6, 2v7 for 8 competitors)
function generateBracketPairs(numCompetitors: number): [number, number][] {
  const pairs: [number, number][] = [];
  const numPairs = Math.floor(numCompetitors / 2);

  if (numCompetitors === 8) {
    return [[1, 8], [4, 5], [3, 6], [2, 7]];
  } else if (numCompetitors === 4) {
    return [[1, 4], [2, 3]];
  } else if (numCompetitors === 16) {
    return [[1, 16], [8, 9], [4, 13], [5, 12], [3, 14], [6, 11], [2, 15], [7, 10]];
  }

  // Default: sequential pairing
  for (let i = 0; i < numPairs; i++) {
    pairs.push([i * 2 + 1, i * 2 + 2]);
  }
  return pairs;
}
