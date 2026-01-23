import { NextRequest, NextResponse } from 'next/server';
import prisma, { TransactionClient } from '@/lib/db';
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

// GET /api/admin/matchups - Get matchups for a round
export async function GET(request: NextRequest) {
  try {
    const user = await checkAdminSession(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const roundId = searchParams.get('roundId');
    const campaignId = searchParams.get('campaignId');

    const where: Record<string, string> = {};
    if (roundId) where.roundId = roundId;
    if (campaignId) where.campaignId = campaignId;

    const matchups = await prisma.matchup.findMany({
      where,
      include: {
        competitor1: true,
        competitor2: true,
        winner: true,
        round: true,
        _count: { select: { votes: true } },
      },
      orderBy: [
        { round: { roundNumber: 'asc' } },
        { matchupIndex: 'asc' },
      ],
    });

    return NextResponse.json({ matchups });
  } catch (error) {
    console.error('Error fetching matchups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch matchups' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/matchups - Update a matchup (set winner, change competitors)
export async function PUT(request: NextRequest) {
  try {
    const user = await checkAdminSession(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, winnerId, competitor1Id, competitor2Id } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const matchup = await prisma.matchup.findUnique({
      where: { id },
      include: {
        round: true,
        competitor1: true,
        competitor2: true,
      },
    });

    if (!matchup) {
      return NextResponse.json({ error: 'Matchup not found' }, { status: 404 });
    }

    // Update the matchup
    const updatedMatchup = await prisma.matchup.update({
      where: { id },
      data: {
        ...(winnerId !== undefined && { winnerId }),
        ...(competitor1Id !== undefined && { competitor1Id }),
        ...(competitor2Id !== undefined && { competitor2Id }),
      },
      include: {
        competitor1: true,
        competitor2: true,
        winner: true,
        round: true,
      },
    });

    // If a winner was set, update the loser as eliminated and advance winner to next round
    if (winnerId && matchup.round) {
      const loserId = winnerId === matchup.competitor1Id 
        ? matchup.competitor2Id 
        : matchup.competitor1Id;

      if (loserId) {
        await prisma.competitor.update({
          where: { id: loserId },
          data: {
            isEliminated: true,
            eliminatedInRound: matchup.round.roundNumber,
          },
        });
      }

      // Find the next round's matchup to advance the winner to
      const nextRound = await prisma.round.findFirst({
        where: {
          campaignId: matchup.campaignId,
          roundNumber: matchup.round.roundNumber + 1,
        },
        include: { matchups: { orderBy: { matchupIndex: 'asc' } } },
      });

      if (nextRound && nextRound.matchups.length > 0) {
        // Determine which matchup slot (matchup index / 2)
        const nextMatchupIndex = Math.floor(matchup.matchupIndex / 2);
        const nextMatchup = nextRound.matchups[nextMatchupIndex];

        if (nextMatchup) {
          // Determine if winner goes to competitor1 or competitor2 slot
          const isFirstOfPair = matchup.matchupIndex % 2 === 0;
          await prisma.matchup.update({
            where: { id: nextMatchup.id },
            data: isFirstOfPair
              ? { competitor1Id: winnerId }
              : { competitor2Id: winnerId },
          });
        }
      }
    }

    await logAudit('MATCHUP_WINNER_SET', 'Matchup', id, {
      winnerId,
      userId: user.id,
    });

    return NextResponse.json({ matchup: updatedMatchup });
  } catch (error) {
    console.error('Error updating matchup:', error);
    return NextResponse.json(
      { error: 'Failed to update matchup' },
      { status: 500 }
    );
  }
}

// POST /api/admin/matchups/auto-advance - Auto-set winners based on vote counts
export async function POST(request: NextRequest) {
  try {
    const user = await checkAdminSession(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { roundId } = body;

    if (!roundId) {
      return NextResponse.json({ error: 'roundId is required' }, { status: 400 });
    }

    const round = await prisma.round.findUnique({
      where: { id: roundId },
      include: {
        matchups: {
          include: {
            competitor1: true,
            competitor2: true,
          },
        },
        campaign: true,
      },
    });

    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    const results = [];

    for (const matchup of round.matchups) {
      if (matchup.winnerId) {
        results.push({ matchupId: matchup.id, status: 'already_decided' });
        continue;
      }

      if (!matchup.competitor1Id || !matchup.competitor2Id) {
        results.push({ matchupId: matchup.id, status: 'incomplete_matchup' });
        continue;
      }

      // Determine winner based on votes
      let winnerId: string;
      if (matchup.competitor1Votes > matchup.competitor2Votes) {
        winnerId = matchup.competitor1Id;
      } else if (matchup.competitor2Votes > matchup.competitor1Votes) {
        winnerId = matchup.competitor2Id;
      } else {
        // Tie - favor higher seed
        winnerId = (matchup.competitor1?.seed || 99) < (matchup.competitor2?.seed || 99)
          ? matchup.competitor1Id
          : matchup.competitor2Id;
      }

      const loserId = winnerId === matchup.competitor1Id 
        ? matchup.competitor2Id 
        : matchup.competitor1Id;

      // Update matchup with winner
      await prisma.matchup.update({
        where: { id: matchup.id },
        data: { winnerId },
      });

      // Mark loser as eliminated
      await prisma.competitor.update({
        where: { id: loserId },
        data: {
          isEliminated: true,
          eliminatedInRound: round.roundNumber,
        },
      });

      // Advance winner to next round
      const nextRound = await prisma.round.findFirst({
        where: {
          campaignId: round.campaignId,
          roundNumber: round.roundNumber + 1,
        },
        include: { matchups: { orderBy: { matchupIndex: 'asc' } } },
      });

      if (nextRound && nextRound.matchups.length > 0) {
        const nextMatchupIndex = Math.floor(matchup.matchupIndex / 2);
        const nextMatchup = nextRound.matchups[nextMatchupIndex];

        if (nextMatchup) {
          const isFirstOfPair = matchup.matchupIndex % 2 === 0;
          await prisma.matchup.update({
            where: { id: nextMatchup.id },
            data: isFirstOfPair
              ? { competitor1Id: winnerId }
              : { competitor2Id: winnerId },
          });
        }
      }

      results.push({
        matchupId: matchup.id,
        status: 'winner_set',
        winnerId,
        votes: {
          competitor1: matchup.competitor1Votes,
          competitor2: matchup.competitor2Votes,
        },
      });
    }

    // Mark round as complete
    await prisma.round.update({
      where: { id: roundId },
      data: { isComplete: true, isActive: false },
    });

    await logAudit('ROUND_COMPLETED', 'Round', roundId, {
      results,
      userId: user.id,
    });

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Error auto-advancing matchups:', error);
    return NextResponse.json(
      { error: 'Failed to auto-advance matchups' },
      { status: 500 }
    );
  }
}
