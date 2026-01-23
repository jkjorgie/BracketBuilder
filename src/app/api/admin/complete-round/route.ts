import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// POST /api/admin/complete-round - Complete a round and advance winners
export async function POST(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { campaignSlug, roundNumber } = body;

    if (!campaignSlug || roundNumber === undefined) {
      return NextResponse.json(
        { error: 'campaignSlug and roundNumber are required' },
        { status: 400 }
      );
    }

    const campaign = await prisma.campaign.findUnique({
      where: { slug: campaignSlug },
      include: {
        rounds: {
          include: {
            matchups: {
              include: {
                competitor1: true,
                competitor2: true,
              },
            },
          },
          orderBy: { roundNumber: 'asc' },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const currentRound = campaign.rounds.find(r => r.roundNumber === roundNumber);
    if (!currentRound) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    if (!currentRound.isActive) {
      return NextResponse.json({ error: 'This round is not active' }, { status: 400 });
    }

    if (currentRound.isComplete) {
      return NextResponse.json({ error: 'This round is already complete' }, { status: 400 });
    }

    // Determine winners based on vote counts
    const winners: { matchupId: string; winnerId: string; loserId: string }[] = [];
    
    for (const matchup of currentRound.matchups) {
      if (!matchup.competitor1Id || !matchup.competitor2Id) {
        return NextResponse.json(
          { error: `Matchup ${matchup.id} is missing competitors` },
          { status: 400 }
        );
      }

      // Winner is whoever has more votes (tie goes to higher seed)
      let winnerId: string;
      let loserId: string;

      if (matchup.competitor1Votes > matchup.competitor2Votes) {
        winnerId = matchup.competitor1Id;
        loserId = matchup.competitor2Id;
      } else if (matchup.competitor2Votes > matchup.competitor1Votes) {
        winnerId = matchup.competitor2Id;
        loserId = matchup.competitor1Id;
      } else {
        // Tie - higher seed wins (lower seed number)
        const seed1 = matchup.competitor1?.seed ?? 999;
        const seed2 = matchup.competitor2?.seed ?? 999;
        if (seed1 <= seed2) {
          winnerId = matchup.competitor1Id;
          loserId = matchup.competitor2Id;
        } else {
          winnerId = matchup.competitor2Id;
          loserId = matchup.competitor1Id;
        }
      }

      winners.push({ matchupId: matchup.id, winnerId, loserId });
    }

    // Apply winners in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Set winners on matchups and eliminate losers
      for (const { matchupId, winnerId, loserId } of winners) {
        await tx.matchup.update({
          where: { id: matchupId },
          data: { winnerId },
        });

        await tx.competitor.update({
          where: { id: loserId },
          data: {
            isEliminated: true,
            eliminatedInRound: roundNumber,
          },
        });
      }

      // Mark current round as complete
      await tx.round.update({
        where: { id: currentRound.id },
        data: { isActive: false, isComplete: true },
      });

      // Find and activate next round
      const nextRound = campaign.rounds.find(r => r.roundNumber === roundNumber + 1);
      
      if (nextRound) {
        // Advance winners to next round matchups
        const nextMatchups = await tx.matchup.findMany({
          where: { roundId: nextRound.id },
          orderBy: { matchupIndex: 'asc' },
        });

        // Winners feed into next round: matchup 0 & 1 winners -> next matchup 0, etc.
        for (let i = 0; i < nextMatchups.length; i++) {
          const winner1 = winners[i * 2]?.winnerId;
          const winner2 = winners[i * 2 + 1]?.winnerId;

          await tx.matchup.update({
            where: { id: nextMatchups[i].id },
            data: {
              competitor1Id: winner1 || null,
              competitor2Id: winner2 || null,
            },
          });
        }

        // Activate next round
        await tx.round.update({
          where: { id: nextRound.id },
          data: { isActive: true },
        });

        // Update campaign current round
        await tx.campaign.update({
          where: { id: campaign.id },
          data: { currentRound: roundNumber + 1 },
        });
      } else {
        // This was the final round - we have a champion!
        // The winner of the last matchup is the champion
        if (winners.length === 1) {
          // Campaign is complete
          await tx.campaign.update({
            where: { id: campaign.id },
            data: { isActive: false },
          });
        }
      }

      return { winners, nextRound: nextRound?.roundNumber };
    });

    await logAudit('ROUND_COMPLETED', 'Round', currentRound.id, { 
      roundNumber, 
      winnersCount: winners.length,
      nextRound: result.nextRound,
    }, request);

    return NextResponse.json({
      success: true,
      message: `Round ${roundNumber} completed`,
      winners: result.winners,
      nextRound: result.nextRound,
    });
  } catch (error) {
    console.error('Error completing round:', error);
    return NextResponse.json(
      { error: 'Failed to complete round' },
      { status: 500 }
    );
  }
}
