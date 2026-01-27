import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logAudit } from '@/lib/audit';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

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

// GET /api/campaigns/[slug] - Get a specific campaign with all data needed for voting/results
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;

    const campaign = await prisma.campaign.findUnique({
      where: { slug },
      include: {
        competitors: {
          orderBy: { seed: 'asc' },
        },
        rounds: {
          include: {
            matchups: {
              include: {
                competitor1: true,
                competitor2: true,
                winner: true,
              },
              orderBy: { matchupIndex: 'asc' },
            },
          },
          orderBy: { roundNumber: 'asc' },
        },
        votes: true,
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
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

    // Calculate statistics
    const votesBySource = campaign.votes.reduce((acc, vote) => {
      acc[vote.source] = (acc[vote.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const uniqueVoters = new Set(campaign.votes.map(v => v.voterEmail)).size;

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
      rounds: campaign.rounds.map((round) => ({
        roundNumber: round.roundNumber,
        name: round.name,
        isActive: round.isActive,
        isComplete: round.isComplete,
        startDate: round.startDate?.toISOString(),
        endDate: round.endDate?.toISOString(),
        matchups: round.matchups.map((matchup) => ({
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
      statistics: {
        totalVotes: campaign.votes.length,
        uniqueVoters,
        totalCompetitors: campaign.competitors.length,
        votesBySource: Object.entries(votesBySource).map(([source, count]) => ({
          source,
          count,
        })),
      },
      // Find champion if final round is complete
      champion: (() => {
        const finalRound = campaign.rounds.find((r) => r.roundNumber === campaign.rounds.length);
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
    console.error('Error fetching campaign:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign' },
      { status: 500 }
    );
  }
}

// PATCH /api/campaigns/[slug] - Update a campaign (admin only)
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await checkAdminSession(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await context.params;
    const body = await request.json();

    const campaign = await prisma.campaign.findUnique({ where: { slug } });
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const updated = await prisma.campaign.update({
      where: { slug },
      data: {
        name: body.name,
        description: body.description,
        isDemo: body.isDemo,
        isActive: body.isActive,
        currentRound: body.currentRound,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
      },
    });

    await logAudit('CAMPAIGN_UPDATED', 'Campaign', updated.id, body, request);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to update campaign' },
      { status: 500 }
    );
  }
}

// DELETE /api/campaigns/[slug] - Delete a campaign (admin only)
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await checkAdminSession(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await context.params;

    const campaign = await prisma.campaign.findUnique({ where: { slug } });
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    await prisma.campaign.delete({ where: { slug } });

    await logAudit('CAMPAIGN_DELETED', 'Campaign', campaign.id, { slug }, request);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json(
      { error: 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}
