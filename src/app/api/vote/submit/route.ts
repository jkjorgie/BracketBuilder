import { NextRequest, NextResponse } from 'next/server';
import prisma, { TransactionClient } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { encrypt } from '@/lib/encryption';

// POST /api/vote/submit - Submit all votes for a round at once
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignSlug, selections, voterName, voterEmail, source = 'direct' } = body;

    // selections is an object: { matchupId: competitorId, ... }

    // Validate required fields
    if (!campaignSlug || !selections || !voterName || !voterEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: campaignSlug, selections, voterName, voterEmail' },
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

    // Validate vote source if not 'direct'
    if (source !== 'direct') {
      const voteSource = await prisma.voteSource.findUnique({
        where: { code: source },
      });

      if (!voteSource) {
        return NextResponse.json(
          { error: 'Invalid vote source', invalidSource: true },
          { status: 400 }
        );
      }

      if (!voteSource.isActive) {
        return NextResponse.json(
          { error: 'This vote source is not currently active', inactiveSource: true },
          { status: 403 }
        );
      }

      // Check validity period if set
      if (voteSource.validFrom || voteSource.validUntil) {
        const now = new Date();
        if (voteSource.validFrom && now < voteSource.validFrom) {
          return NextResponse.json(
            { error: 'This vote source is not yet valid', inactiveSource: true },
            { status: 403 }
          );
        }
        if (voteSource.validUntil && now > voteSource.validUntil) {
          return NextResponse.json(
            { error: 'This vote source has expired', inactiveSource: true },
            { status: 403 }
          );
        }
      }
    }

    // Get the campaign
    const campaign = await prisma.campaign.findUnique({
      where: { slug: campaignSlug },
      include: {
        rounds: {
          where: { isActive: true },
          include: {
            matchups: {
              include: {
                competitor1: true,
                competitor2: true,
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

    if (!campaign.isActive) {
      return NextResponse.json(
        { error: 'This campaign is not currently active' },
        { status: 400 }
      );
    }

    const activeRound = campaign.rounds[0];
    if (!activeRound) {
      return NextResponse.json(
        { error: 'No active round found' },
        { status: 400 }
      );
    }

    if (activeRound.isComplete) {
      return NextResponse.json(
        { error: 'This round has already been completed' },
        { status: 400 }
      );
    }

    // Validate all selections
    type MatchupType = typeof activeRound.matchups[number];
    const matchupMap: Record<string, MatchupType> = {};
    for (const m of activeRound.matchups) {
      matchupMap[m.id] = m;
    }
    const selectionEntries = Object.entries(selections) as [string, string][];

    for (const [matchupId, competitorId] of selectionEntries) {
      const matchup = matchupMap[matchupId];
      if (!matchup) {
        return NextResponse.json(
          { error: `Invalid matchup: ${matchupId}` },
          { status: 400 }
        );
      }
      if (competitorId !== matchup.competitor1Id && competitorId !== matchup.competitor2Id) {
        return NextResponse.json(
          { error: `Invalid competitor for matchup ${matchupId}` },
          { status: 400 }
        );
      }
    }

    // Check for existing votes from this source
    const existingVotes = await prisma.vote.findMany({
      where: {
        matchupId: { in: selectionEntries.map(([id]) => id) },
        voterEmail: encrypt(voterEmail),
        source,
      },
    });

    if (existingVotes.length > 0) {
      return NextResponse.json(
        { error: 'You have already voted from this source' },
        { status: 409 }
      );
    }

    // Create all votes in a transaction
    const votes = await prisma.$transaction(async (tx: TransactionClient) => {
      const createdVotes = [];
      
      // Encrypt voter data once
      const encryptedName = encrypt(voterName);
      const encryptedEmail = encrypt(voterEmail);

      for (const [matchupId, competitorId] of selectionEntries) {
        const matchup = matchupMap[matchupId]!;

        // Create the vote
        const vote = await tx.vote.create({
          data: {
            matchupId,
            competitorId,
            campaignId: campaign.id,
            voterName: encryptedName,
            voterEmail: encryptedEmail,
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

        createdVotes.push(vote);
      }

      return createdVotes;
    });

    await logAudit('VOTE_SUBMITTED', 'Vote', votes[0]?.id || 'batch', {
      campaignSlug,
      roundNumber: activeRound.roundNumber,
      source,
      votesCount: votes.length,
      voterEmail: voterEmail.replace(/(.{2}).*(@.*)/, '$1***$2'),
    }, request);

    return NextResponse.json({
      success: true,
      message: 'Bracket submitted successfully',
      votesCount: votes.length,
    }, { status: 201 });
  } catch (error) {
    console.error('Error submitting bracket:', error);

    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'You have already voted from this source' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to submit bracket' },
      { status: 500 }
    );
  }
}
