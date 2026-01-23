import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET /api/results - Get results and vote statistics for the active campaign
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const campaignSlug = searchParams.get('campaign');

    // Find the campaign (active one or specific slug)
    const campaign = campaignSlug
      ? await prisma.campaign.findUnique({
          where: { slug: campaignSlug },
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
        })
      : await prisma.campaign.findFirst({
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
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Get vote statistics
    const totalVotes = await prisma.vote.count({
      where: { campaignId: campaign.id },
    });

    const uniqueVoters = await prisma.vote.groupBy({
      by: ['voterEmail'],
      where: { campaignId: campaign.id },
    });

    // Get votes by source
    const votesBySource = await prisma.vote.groupBy({
      by: ['source'],
      where: { campaignId: campaign.id },
      _count: { id: true },
    });

    // Find eliminated competitors
    const eliminatedIds = new Set<string>();
    for (const round of campaign.rounds) {
      if (round.isComplete) {
        for (const matchup of round.matchups) {
          if (matchup.winnerId) {
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

    // Find champion
    const finalRound = campaign.rounds.find((r: typeof campaign.rounds[number]) => r.roundNumber === campaign.rounds.length);
    const champion = finalRound?.isComplete && finalRound.matchups[0]?.winner
      ? {
          id: finalRound.matchups[0].winner.id,
          name: finalRound.matchups[0].winner.name,
          description: finalRound.matchups[0].winner.description,
        }
      : null;

    // Get site config
    const siteConfig = await prisma.siteConfig.findFirst({
      where: { isActive: true },
    });

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
      } : null,
      rounds: campaign.rounds.map(round => ({
        roundNumber: round.roundNumber,
        name: round.name,
        isActive: round.isActive,
        isComplete: round.isComplete,
        matchups: round.matchups.map(matchup => ({
          id: matchup.id,
          matchupIndex: matchup.matchupIndex,
          contestant1: matchup.competitor1 ? {
            id: matchup.competitor1.id,
            name: matchup.competitor1.name,
            description: matchup.competitor1.description,
            seed: matchup.competitor1.seed,
          } : null,
          contestant2: matchup.competitor2 ? {
            id: matchup.competitor2.id,
            name: matchup.competitor2.name,
            description: matchup.competitor2.description,
            seed: matchup.competitor2.seed,
          } : null,
          winner: matchup.winner ? {
            id: matchup.winner.id,
            name: matchup.winner.name,
          } : null,
          competitor1Votes: matchup.competitor1Votes,
          competitor2Votes: matchup.competitor2Votes,
        })),
      })),
      statistics: {
        totalVotes,
        uniqueVoters: uniqueVoters.length,
        totalCompetitors: campaign.competitors.length,
        votesBySource: votesBySource.map(v => ({
          source: v.source,
          count: v._count.id,
        })),
      },
      eliminatedCompetitorIds: Array.from(eliminatedIds),
      champion,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch results' },
      { status: 500 }
    );
  }
}
