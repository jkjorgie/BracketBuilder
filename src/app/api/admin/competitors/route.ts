import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// GET /api/admin/competitors - Get competitors for a campaign
export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');

    if (!campaignId) {
      return NextResponse.json(
        { error: 'campaignId is required' },
        { status: 400 }
      );
    }

    const competitors = await prisma.competitor.findMany({
      where: { campaignId },
      orderBy: { seed: 'asc' },
    });

    return NextResponse.json({ competitors });
  } catch (error) {
    console.error('Error fetching competitors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch competitors' },
      { status: 500 }
    );
  }
}

// POST /api/admin/competitors - Create a new competitor
export async function POST(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { campaignId, name, description, seed, imageUrl } = body;

    if (!campaignId || !name || !description) {
      return NextResponse.json(
        { error: 'campaignId, name, and description are required' },
        { status: 400 }
      );
    }

    // Verify campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const competitor = await prisma.competitor.create({
      data: {
        campaignId,
        name,
        description,
        seed: seed || null,
        imageUrl: imageUrl || null,
      },
    });

    await logAudit('COMPETITOR_CREATED', 'Competitor', competitor.id, {
      campaignId,
      name,
      seed,
    }, request);

    return NextResponse.json({ competitor }, { status: 201 });
  } catch (error) {
    console.error('Error creating competitor:', error);
    return NextResponse.json(
      { error: 'Failed to create competitor' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/competitors - Update a competitor
export async function PUT(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { id, name, description, seed, imageUrl, isEliminated } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const existing = await prisma.competitor.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Competitor not found' },
        { status: 404 }
      );
    }

    const competitor = await prisma.competitor.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        seed: seed !== undefined ? seed : undefined,
        imageUrl: imageUrl !== undefined ? imageUrl : undefined,
        isEliminated: isEliminated !== undefined ? isEliminated : undefined,
      },
    });

    await logAudit('COMPETITOR_UPDATED', 'Competitor', competitor.id, body, request);

    return NextResponse.json({ competitor });
  } catch (error) {
    console.error('Error updating competitor:', error);
    return NextResponse.json(
      { error: 'Failed to update competitor' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/competitors - Delete a competitor
export async function DELETE(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const existing = await prisma.competitor.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Competitor not found' },
        { status: 404 }
      );
    }

    // Check if competitor is in any matchups
    const matchupCount = await prisma.matchup.count({
      where: {
        OR: [
          { competitor1Id: id },
          { competitor2Id: id },
        ],
      },
    });

    if (matchupCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete competitor that is part of matchups. Remove from matchups first.' },
        { status: 400 }
      );
    }

    await prisma.competitor.delete({ where: { id } });

    await logAudit('COMPETITOR_DELETED', 'Competitor', id, { name: existing.name }, request);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting competitor:', error);
    return NextResponse.json(
      { error: 'Failed to delete competitor' },
      { status: 500 }
    );
  }
}
