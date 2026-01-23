import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { Prisma } from '@prisma/client';
import { logAudit } from '@/lib/audit';

type TransactionClient = Prisma.TransactionClient;

// POST /api/vote - Submit a vote
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignSlug, matchupId, competitorId, voterName, voterEmail, source = 'direct' } = body;

    // Validate required fields
    if (!campaignSlug || !matchupId || !competitorId || !voterName || !voterEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: campaignSlug, matchupId, competitorId, voterName, voterEmail' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(voterEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Get the campaign
    const campaign = await prisma.campaign.findUnique({
      where: { slug: campaignSlug },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (!campaign.isActive) {
      return NextResponse.json(
        { error: 'This campaign is not currently active' },
        { status: 400 }
      );
    }

    // Get the matchup and verify it's in an active round
    const matchup = await prisma.matchup.findUnique({
      where: { id: matchupId },
      include: {
        round: true,
        competitor1: true,
        competitor2: true,
      },
    });

    if (!matchup) {
      return NextResponse.json(
        { error: 'Matchup not found' },
        { status: 404 }
      );
    }

    if (!matchup.round.isActive) {
      return NextResponse.json(
        { error: 'Voting is not open for this round' },
        { status: 400 }
      );
    }

    if (matchup.round.isComplete) {
      return NextResponse.json(
        { error: 'This round has already been completed' },
        { status: 400 }
      );
    }

    // Verify the competitor is in this matchup
    if (competitorId !== matchup.competitor1Id && competitorId !== matchup.competitor2Id) {
      return NextResponse.json(
        { error: 'Invalid competitor for this matchup' },
        { status: 400 }
      );
    }

    // Check if this voter has already voted on this matchup from this source
    const existingVote = await prisma.vote.findUnique({
      where: {
        matchupId_voterEmail_source: {
          matchupId,
          voterEmail,
          source,
        },
      },
    });

    if (existingVote) {
      return NextResponse.json(
        { error: 'You have already voted on this matchup from this source' },
        { status: 409 }
      );
    }

    // Create the vote and update vote counts
    const vote = await prisma.$transaction(async (tx: TransactionClient) => {
      // Create the vote
      const newVote = await tx.vote.create({
        data: {
          matchupId,
          competitorId,
          campaignId: campaign.id,
          voterName,
          voterEmail,
          source,
        },
      });

      // Update vote counts on the matchup
      const updateField = competitorId === matchup.competitor1Id 
        ? 'competitor1Votes' 
        : 'competitor2Votes';

      await tx.matchup.update({
        where: { id: matchupId },
        data: {
          [updateField]: { increment: 1 },
        },
      });

      return newVote;
    });

    await logAudit('VOTE_SUBMITTED', 'Vote', vote.id, { 
      matchupId, 
      competitorId, 
      source,
      voterEmail: voterEmail.replace(/(.{2}).*(@.*)/, '$1***$2'), // Partially mask email
    }, request);

    return NextResponse.json({
      success: true,
      voteId: vote.id,
      message: 'Vote recorded successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error submitting vote:', error);
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'You have already voted on this matchup from this source' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to submit vote' },
      { status: 500 }
    );
  }
}

// GET /api/vote - Check if a user has voted
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const matchupId = searchParams.get('matchupId');
    const voterEmail = searchParams.get('voterEmail');
    const source = searchParams.get('source') || 'direct';

    if (!matchupId || !voterEmail) {
      return NextResponse.json(
        { error: 'matchupId and voterEmail are required' },
        { status: 400 }
      );
    }

    const existingVote = await prisma.vote.findUnique({
      where: {
        matchupId_voterEmail_source: {
          matchupId,
          voterEmail,
          source,
        },
      },
      select: {
        id: true,
        competitorId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      hasVoted: !!existingVote,
      vote: existingVote,
    });
  } catch (error) {
    console.error('Error checking vote:', error);
    return NextResponse.json(
      { error: 'Failed to check vote status' },
      { status: 500 }
    );
  }
}
