import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { decrypt } from '@/lib/encryption';
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

// GET /api/admin/submissions - Get all vote submissions with decrypted voter info
export async function GET(request: NextRequest) {
  try {
    const user = await checkAdminSession(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all votes with related data
    const votes = await prisma.vote.findMany({
      include: {
        matchup: {
          include: {
            round: true,
            competitor1: true,
            competitor2: true,
          },
        },
        competitor: true,
        campaign: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Decrypt voter information
    const decryptedVotes = votes.map((vote) => {
      let decryptedName = '[Decryption Failed]';
      let decryptedEmail = '[Decryption Failed]';

      try {
        decryptedName = decrypt(vote.voterName);
      } catch (error) {
        console.error('Failed to decrypt voterName:', error);
      }

      try {
        decryptedEmail = decrypt(vote.voterEmail);
      } catch (error) {
        console.error('Failed to decrypt voterEmail:', error);
      }

      return {
        id: vote.id,
        voterName: decryptedName,
        voterEmail: decryptedEmail,
        source: vote.source,
        createdAt: vote.createdAt,
        campaign: {
          id: vote.campaign.id,
          name: vote.campaign.name,
          slug: vote.campaign.slug,
        },
        round: {
          id: vote.matchup.round.id,
          roundNumber: vote.matchup.round.roundNumber,
          name: vote.matchup.round.name,
        },
        matchup: {
          id: vote.matchup.id,
          matchupIndex: vote.matchup.matchupIndex,
          competitor1: vote.matchup.competitor1?.name || 'TBD',
          competitor2: vote.matchup.competitor2?.name || 'TBD',
        },
        selectedCompetitor: vote.competitor.name,
      };
    });

    // Group by campaign and round for easier viewing
    const grouped = decryptedVotes.reduce((acc, vote) => {
      const campaignKey = vote.campaign.slug;
      if (!acc[campaignKey]) {
        acc[campaignKey] = {
          campaign: vote.campaign,
          rounds: {},
        };
      }
      
      const roundKey = vote.round.roundNumber;
      if (!acc[campaignKey].rounds[roundKey]) {
        acc[campaignKey].rounds[roundKey] = {
          round: vote.round,
          votes: [],
        };
      }
      
      acc[campaignKey].rounds[roundKey].votes.push(vote);
      
      return acc;
    }, {} as any);

    return NextResponse.json({
      success: true,
      totalVotes: votes.length,
      votes: decryptedVotes,
      grouped,
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/submissions?id=<voteId> - Delete a single vote and adjust matchup counts
export async function DELETE(request: NextRequest) {
  try {
    const user = await checkAdminSession(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const voteId = searchParams.get('id');
    if (!voteId) {
      return NextResponse.json({ error: 'Vote ID required' }, { status: 400 });
    }

    // Find vote with its matchup to know which count to decrement
    const vote = await prisma.vote.findUnique({
      where: { id: voteId },
      include: { matchup: true },
    });

    if (!vote) {
      return NextResponse.json({ error: 'Vote not found' }, { status: 404 });
    }

    const isCompetitor1 = vote.competitorId === vote.matchup.competitor1Id;

    await prisma.$transaction([
      prisma.vote.delete({ where: { id: voteId } }),
      prisma.matchup.update({
        where: { id: vote.matchupId },
        data: {
          ...(isCompetitor1
            ? { competitor1Votes: { decrement: 1 } }
            : { competitor2Votes: { decrement: 1 } }),
        },
      }),
    ]);

    await logAudit('VOTE_DELETED', 'Vote', voteId, { deletedBy: user.email, source: vote.source }, request);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting vote:', error);
    return NextResponse.json(
      { error: 'Failed to delete vote' },
      { status: 500 }
    );
  }
}
