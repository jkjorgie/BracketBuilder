import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET /api/vote/check - Check which matchups a user has already voted on
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const campaignSlug = searchParams.get('campaign');
    const voterEmail = searchParams.get('email');
    const source = searchParams.get('source') || 'direct';
    const roundNumber = searchParams.get('round');

    if (!campaignSlug || !voterEmail) {
      return NextResponse.json(
        { error: 'campaign and email are required' },
        { status: 400 }
      );
    }

    // Get the campaign
    const campaign = await prisma.campaign.findUnique({
      where: { slug: campaignSlug },
      include: {
        rounds: {
          where: roundNumber ? { roundNumber: parseInt(roundNumber) } : { isActive: true },
          include: {
            matchups: true,
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

    // Get all matchup IDs from the active/specified round
    const matchupIds = campaign.rounds.flatMap((r: typeof campaign.rounds[number]) => 
      r.matchups.map((m: typeof r.matchups[number]) => m.id)
    );

    if (matchupIds.length === 0) {
      return NextResponse.json({
        hasVoted: false,
        votedMatchups: [],
        allMatchupsVoted: false,
      });
    }

    // Find all votes by this user for these matchups from this source
    const votes = await prisma.vote.findMany({
      where: {
        matchupId: { in: matchupIds },
        voterEmail,
        source,
      },
      select: {
        matchupId: true,
        competitorId: true,
      },
    });

    const votedMatchupMap: Record<string, string> = {};
    for (const vote of votes) {
      votedMatchupMap[vote.matchupId] = vote.competitorId;
    }

    return NextResponse.json({
      hasVoted: votes.length > 0,
      votedMatchups: votedMatchupMap,
      allMatchupsVoted: votes.length === matchupIds.length,
      totalMatchups: matchupIds.length,
      votedCount: votes.length,
    });
  } catch (error) {
    console.error('Error checking votes:', error);
    return NextResponse.json(
      { error: 'Failed to check vote status' },
      { status: 500 }
    );
  }
}
