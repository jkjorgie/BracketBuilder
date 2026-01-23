import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
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

// GET /api/admin/campaigns - Get all campaigns with full details
export async function GET(request: NextRequest) {
  try {
    const user = await checkAdminSession(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaigns = await prisma.campaign.findMany({
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
        _count: {
          select: { votes: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

// POST /api/admin/campaigns - Create a new campaign
export async function POST(request: NextRequest) {
  try {
    const user = await checkAdminSession(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, slug, isDemo, startDate, endDate, competitors } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'name and slug are required' },
        { status: 400 }
      );
    }

    // Check if slug is unique
    const existing = await prisma.campaign.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A campaign with this slug already exists' },
        { status: 400 }
      );
    }

    const campaign = await prisma.campaign.create({
      data: {
        name,
        description,
        slug,
        isDemo: isDemo ?? false,
        isActive: false,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        currentRound: 1,
      },
    });

    // Create competitors if provided
    if (competitors && Array.isArray(competitors)) {
      for (let i = 0; i < competitors.length; i++) {
        await prisma.competitor.create({
          data: {
            name: competitors[i].name,
            description: competitors[i].description || '',
            seed: i + 1,
            campaignId: campaign.id,
          },
        });
      }
    }

    await logAudit('CAMPAIGN_CREATED', 'Campaign', campaign.id, {
      name,
      slug,
      userId: user.id,
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/campaigns - Update a campaign
export async function PUT(request: NextRequest) {
  try {
    const user = await checkAdminSession(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, description, isDemo, isActive, startDate, endDate } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // If setting as active, deactivate all other campaigns
    if (isActive) {
      await prisma.campaign.updateMany({
        where: { id: { not: id } },
        data: { isActive: false },
      });
    }

    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(isDemo !== undefined && { isDemo }),
        ...(isActive !== undefined && { isActive }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      },
    });

    await logAudit('CAMPAIGN_UPDATED', 'Campaign', campaign.id, {
      updates: body,
      userId: user.id,
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('Error updating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to update campaign' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/campaigns - Delete a campaign
export async function DELETE(request: NextRequest) {
  try {
    const user = await checkAdminSession(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Delete the campaign (cascades to related records)
    await prisma.campaign.delete({
      where: { id },
    });

    await logAudit('CAMPAIGN_DELETED', 'Campaign', id, { userId: user.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json(
      { error: 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}
