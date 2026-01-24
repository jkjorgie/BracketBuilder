import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET /api/sources - Get vote sources, optionally filtered by campaign
export async function GET(request: NextRequest) {
  try {
    const activeOnly = request.nextUrl.searchParams.get('active') === 'true';
    const campaignSlug = request.nextUrl.searchParams.get('campaignSlug');

    // Build where clause
    const where: {
      isActive?: boolean;
      campaignId?: string;
    } = {};
    
    if (activeOnly) {
      where.isActive = true;
    }
    
    // Filter by campaign if slug provided
    if (campaignSlug) {
      const campaign = await prisma.campaign.findUnique({
        where: { slug: campaignSlug },
      });
      
      if (!campaign) {
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 }
        );
      }
      
      where.campaignId = campaign.id;
    }

    const sources = await prisma.voteSource.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
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
