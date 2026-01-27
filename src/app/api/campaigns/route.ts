import { NextRequest, NextResponse } from 'next/server';
import prisma, { TransactionClient } from '@/lib/db';
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

// GET /api/campaigns - Get all campaigns (public) or with details (admin)
export async function GET(request: NextRequest) {
  try {
    const includeDetails = request.nextUrl.searchParams.get('details') === 'true';

    if (includeDetails) {
      // Admin view with full details - check session
      const user = await checkAdminSession(request);
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const campaigns = await prisma.campaign.findMany({
        include: {
          competitors: true,
          rounds: {
            include: {
              matchups: {
                include: {
                  competitor1: true,
                  competitor2: true,
                  winner: true,
                },
              },
            },
            orderBy: { roundNumber: 'asc' },
          },
          _count: {
            select: { votes: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json(campaigns);
    }

    // Public view - only active campaigns with limited info
    const campaigns = await prisma.campaign.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        isDemo: true,
        currentRound: true,
        startDate: true,
        endDate: true,
      },
    });

    return NextResponse.json(campaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

// POST /api/campaigns - Create a new campaign (admin only)
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
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    // Check if slug is unique
    const existing = await prisma.campaign.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: 'A campaign with this slug already exists' },
        { status: 409 }
      );
    }

    // Create campaign with competitors and initial rounds
    const campaign = await prisma.$transaction(async (tx: TransactionClient) => {
      // Create the campaign
      const newCampaign = await tx.campaign.create({
        data: {
          name,
          description,
          slug,
          isDemo: isDemo ?? false,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
        },
      });

      // Create competitors if provided
      if (competitors && Array.isArray(competitors) && competitors.length > 0) {
        await tx.competitor.createMany({
          data: competitors.map((c: { name: string; description: string; seed?: number }, index: number) => ({
            name: c.name,
            description: c.description,
            seed: c.seed ?? index + 1,
            campaignId: newCampaign.id,
          })),
        });
      }

      // Fetch the created campaign with competitors
      return tx.campaign.findUnique({
        where: { id: newCampaign.id },
        include: { competitors: true },
      });
    });

    await logAudit('CAMPAIGN_CREATED', 'Campaign', campaign!.id, { name, slug, isDemo }, request);

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
