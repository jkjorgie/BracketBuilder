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

// GET /api/admin/vote-sources - Get vote sources, optionally filtered by campaign
export async function GET(request: NextRequest) {
  try {
    const user = await checkAdminSession(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaignId = request.nextUrl.searchParams.get('campaignId');

    const sources = await prisma.voteSource.findMany({
      where: campaignId ? { campaignId } : undefined,
      include: {
        campaign: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { code: 'asc' },
    });

    return NextResponse.json({ sources });
  } catch (error) {
    console.error('Error fetching vote sources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vote sources' },
      { status: 500 }
    );
  }
}

// POST /api/admin/vote-sources - Create a new vote source
export async function POST(request: NextRequest) {
  try {
    const user = await checkAdminSession(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { code, name, description, campaignId, validFrom, validUntil, isActive } = body;

    if (!code || !name || !campaignId) {
      return NextResponse.json(
        { error: 'code, name, and campaignId are required' },
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

    // Check if code is unique within this campaign
    const existing = await prisma.voteSource.findFirst({
      where: { campaignId, code },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A vote source with this code already exists for this campaign' },
        { status: 400 }
      );
    }

    const source = await prisma.voteSource.create({
      data: {
        code,
        name,
        description,
        campaignId,
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
        isActive: isActive ?? true,
      },
    });

    await logAudit('VOTE_SOURCE_CREATED', 'VoteSource', source.id, {
      code,
      name,
      campaignId,
      userId: user.id,
    });

    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    console.error('Error creating vote source:', error);
    return NextResponse.json(
      { error: 'Failed to create vote source' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/vote-sources - Update a vote source
export async function PUT(request: NextRequest) {
  try {
    const user = await checkAdminSession(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, description, validFrom, validUntil, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const source = await prisma.voteSource.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(validFrom !== undefined && { validFrom: validFrom ? new Date(validFrom) : null }),
        ...(validUntil !== undefined && { validUntil: validUntil ? new Date(validUntil) : null }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    await logAudit('VOTE_SOURCE_UPDATED', 'VoteSource', source.id, body, request);

    return NextResponse.json({ source });
  } catch (error) {
    console.error('Error updating vote source:', error);
    return NextResponse.json(
      { error: 'Failed to update vote source' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/vote-sources - Delete a vote source
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

    const source = await prisma.voteSource.findUnique({ where: { id } });
    
    await prisma.voteSource.delete({
      where: { id },
    });

    await logAudit('VOTE_SOURCE_DELETED', 'VoteSource', id, {
      code: source?.code,
      userId: user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting vote source:', error);
    return NextResponse.json(
      { error: 'Failed to delete vote source' },
      { status: 500 }
    );
  }
}
