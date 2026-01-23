import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

// GET /api/campaigns/[slug] - Get a specific campaign
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
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(campaign);
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
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
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
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
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
