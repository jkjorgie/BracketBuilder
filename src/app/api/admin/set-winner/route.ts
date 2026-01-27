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

// POST /api/admin/set-winner - Manually set a winner for a matchup (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await checkAdminSession(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { matchupId, winnerId } = body;

    if (!matchupId || !winnerId) {
      return NextResponse.json(
        { error: 'matchupId and winnerId are required' },
        { status: 400 }
      );
    }

    const matchup = await prisma.matchup.findUnique({
      where: { id: matchupId },
      include: {
        competitor1: true,
        competitor2: true,
        round: true,
      },
    });

    if (!matchup) {
      return NextResponse.json({ error: 'Matchup not found' }, { status: 404 });
    }

    // Verify winner is one of the competitors
    if (winnerId !== matchup.competitor1Id && winnerId !== matchup.competitor2Id) {
      return NextResponse.json(
        { error: 'Winner must be one of the matchup competitors' },
        { status: 400 }
      );
    }

    // Determine loser
    const loserId = winnerId === matchup.competitor1Id 
      ? matchup.competitor2Id 
      : matchup.competitor1Id;

    // Update in transaction
    await prisma.$transaction(async (tx: TransactionClient) => {
      // Set winner
      await tx.matchup.update({
        where: { id: matchupId },
        data: { winnerId },
      });

      // Mark loser as eliminated if not already
      if (loserId) {
        await tx.competitor.update({
          where: { id: loserId },
          data: {
            isEliminated: true,
            eliminatedInRound: matchup.round.roundNumber,
          },
        });
      }
    });

    await logAudit('MATCHUP_WINNER_SET', 'Matchup', matchupId, { winnerId, loserId }, request);

    return NextResponse.json({
      success: true,
      message: 'Winner set successfully',
      winnerId,
      loserId,
    });
  } catch (error) {
    console.error('Error setting winner:', error);
    return NextResponse.json(
      { error: 'Failed to set winner' },
      { status: 500 }
    );
  }
}
