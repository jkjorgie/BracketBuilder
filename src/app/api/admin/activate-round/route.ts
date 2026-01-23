import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logAudit } from '@/lib/audit';

// POST /api/admin/activate-round - Activate or deactivate a round
export async function POST(request: NextRequest) {
  try {
    // Check session authentication
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date() || !session.user.isActive) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { campaignSlug, roundNumber, active } = body;

    if (!campaignSlug || roundNumber === undefined || active === undefined) {
      return NextResponse.json(
        { error: 'campaignSlug, roundNumber, and active are required' },
        { status: 400 }
      );
    }

    // Find the campaign
    const campaign = await prisma.campaign.findUnique({
      where: { slug: campaignSlug },
      include: { rounds: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Find the round
    const round = campaign.rounds.find((r: { roundNumber: number }) => r.roundNumber === roundNumber);
    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    // If activating, deactivate all other rounds first
    if (active) {
      await prisma.round.updateMany({
        where: { campaignId: campaign.id },
        data: { isActive: false },
      });
    }

    // Update the round
    const updatedRound = await prisma.round.update({
      where: { id: round.id },
      data: { isActive: active },
    });

    // Update campaign current round if activating
    if (active) {
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { currentRound: roundNumber },
      });
    }

    await logAudit(
      active ? 'ROUND_STARTED' : 'ROUND_COMPLETED',
      'Round',
      round.id,
      { campaignSlug, roundNumber, active, userId: session.user.id }
    );

    return NextResponse.json({
      success: true,
      round: {
        id: updatedRound.id,
        roundNumber: updatedRound.roundNumber,
        name: updatedRound.name,
        isActive: updatedRound.isActive,
      },
    });
  } catch (error) {
    console.error('Error activating round:', error);
    return NextResponse.json(
      { error: 'Failed to update round' },
      { status: 500 }
    );
  }
}
