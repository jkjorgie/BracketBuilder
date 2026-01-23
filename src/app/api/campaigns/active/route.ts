import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET /api/campaigns/active - Get the active campaign with all data needed for voting
export async function GET() {
  try {
    // Find the active campaign
    const campaign = await prisma.campaign.findFirst({
      where: { isActive: true },
      include: {
        competitors: {
          orderBy: { seed: 'asc' },
        },
        rounds: {
          orderBy: { roundNumber: 'asc' },
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
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'No active campaign found' },
        { status: 404 }
      );
    }

    // Get site configuration
    const siteConfig = await prisma.siteConfig.findFirst({
      where: { isActive: true },
    });

    // Find eliminated competitors (those who lost in completed rounds)
    const eliminatedIds = new Set<string>();
    for (const round of campaign.rounds) {
      if (round.isComplete) {
        for (const matchup of round.matchups) {
          if (matchup.winnerId) {
            // The loser is the one who isn't the winner
            if (matchup.competitor1Id && matchup.competitor1Id !== matchup.winnerId) {
              eliminatedIds.add(matchup.competitor1Id);
            }
            if (matchup.competitor2Id && matchup.competitor2Id !== matchup.winnerId) {
              eliminatedIds.add(matchup.competitor2Id);
            }
          }
        }
      }
    }

    // Transform to frontend-friendly format
    const response = {
      campaign: {
        id: campaign.id,
        slug: campaign.slug,
        name: campaign.name,
        description: campaign.description,
        currentRound: campaign.currentRound,
        isDemo: campaign.isDemo,
      },
      siteConfig: siteConfig ? {
        siteName: siteConfig.siteName,
        eventName: siteConfig.eventName,
        description: siteConfig.description,
      } : null,
      rounds: campaign.rounds.map(round => ({
        roundNumber: round.roundNumber,
        name: round.name,
        isActive: round.isActive,
        isComplete: round.isComplete,
        startDate: round.startDate?.toISOString(),
        endDate: round.endDate?.toISOString(),
        matchups: round.matchups.map(matchup => ({
          id: matchup.id,
          matchupIndex: matchup.matchupIndex,
          roundNumber: round.roundNumber,
          contestant1: matchup.competitor1 ? {
            id: matchup.competitor1.id,
            name: matchup.competitor1.name,
            description: matchup.competitor1.description,
            seed: matchup.competitor1.seed,
            imageUrl: matchup.competitor1.imageUrl,
          } : null,
          contestant2: matchup.competitor2 ? {
            id: matchup.competitor2.id,
            name: matchup.competitor2.name,
            description: matchup.competitor2.description,
            seed: matchup.competitor2.seed,
            imageUrl: matchup.competitor2.imageUrl,
          } : null,
          winner: matchup.winner ? {
            id: matchup.winner.id,
            name: matchup.winner.name,
            description: matchup.winner.description,
            seed: matchup.winner.seed,
          } : null,
          competitor1Votes: matchup.competitor1Votes,
          competitor2Votes: matchup.competitor2Votes,
        })),
      })),
      eliminatedCompetitorIds: Array.from(eliminatedIds),
      // Find champion if final round is complete
      champion: (() => {
        const finalRound = campaign.rounds.find(r => r.roundNumber === campaign.rounds.length);
        if (finalRound?.isComplete && finalRound.matchups[0]?.winner) {
          return {
            id: finalRound.matchups[0].winner.id,
            name: finalRound.matchups[0].winner.name,
            description: finalRound.matchups[0].winner.description,
          };
        }
        return null;
      })(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching active campaign:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign' },
      { status: 500 }
    );
  }
}
