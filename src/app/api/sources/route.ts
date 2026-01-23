import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// GET /api/sources - Get all vote sources
export async function GET(request: NextRequest) {
  try {
    const activeOnly = request.nextUrl.searchParams.get('active') === 'true';

    const sources = await prisma.voteSource.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(sources);
  } catch (error) {
    console.error('Error fetching sources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vote sources' },
      { status: 500 }
    );
  }
}

// POST /api/sources - Create a new vote source (admin only)
export async function POST(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { code, name, description, validFrom, validUntil } = body;

    if (!code || !name) {
      return NextResponse.json(
        { error: 'code and name are required' },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existing = await prisma.voteSource.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json(
        { error: 'A vote source with this code already exists' },
        { status: 409 }
      );
    }

    const source = await prisma.voteSource.create({
      data: {
        code,
        name,
        description,
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
      },
    });

    await logAudit('VOTE_SOURCE_CREATED', 'VoteSource', source.id, { code, name }, request);

    return NextResponse.json(source, { status: 201 });
  } catch (error) {
    console.error('Error creating vote source:', error);
    return NextResponse.json(
      { error: 'Failed to create vote source' },
      { status: 500 }
    );
  }
}

// PATCH /api/sources - Update a vote source (admin only)
export async function PATCH(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { id, code, name, description, validFrom, validUntil, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const source = await prisma.voteSource.update({
      where: { id },
      data: {
        code,
        name,
        description,
        validFrom: validFrom ? new Date(validFrom) : undefined,
        validUntil: validUntil ? new Date(validUntil) : undefined,
        isActive,
      },
    });

    return NextResponse.json(source);
  } catch (error) {
    console.error('Error updating vote source:', error);
    return NextResponse.json(
      { error: 'Failed to update vote source' },
      { status: 500 }
    );
  }
}

// DELETE /api/sources - Delete a vote source (admin only)
export async function DELETE(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    await prisma.voteSource.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting vote source:', error);
    return NextResponse.json(
      { error: 'Failed to delete vote source' },
      { status: 500 }
    );
  }
}
