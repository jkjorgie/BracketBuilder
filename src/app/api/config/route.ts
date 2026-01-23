import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// GET /api/config - Get active site configuration (public)
export async function GET() {
  try {
    // Get the active site config, or create default if none exists
    let config = await prisma.siteConfig.findFirst({
      where: { isActive: true },
    });

    if (!config) {
      // Create default config if none exists
      config = await prisma.siteConfig.create({
        data: {
          siteName: 'GT eForms Feature Face Off',
          eventName: 'Alliance 2026',
          copyright: 'Jay Jorgensen',
          description: 'Help us decide which GT eForms feature to build next! Vote for your favorites.',
          primaryColor: '#FF9E18',
          secondaryColor: '#00B2E3',
          textColor: '#231F20',
          isActive: true,
        },
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}

// PATCH /api/config - Update site configuration (admin only)
export async function PATCH(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();

    // Find active config
    let config = await prisma.siteConfig.findFirst({
      where: { isActive: true },
    });

    if (!config) {
      // Create new config with provided values
      config = await prisma.siteConfig.create({
        data: {
          siteName: body.siteName || 'GT eForms Feature Face Off',
          eventName: body.eventName || 'Alliance 2026',
          copyright: body.copyright || 'Jay Jorgensen',
          description: body.description,
          logoUrl: body.logoUrl,
          primaryColor: body.primaryColor || '#FF9E18',
          secondaryColor: body.secondaryColor || '#00B2E3',
          textColor: body.textColor || '#231F20',
          isActive: true,
        },
      });
    } else {
      // Update existing config
      config = await prisma.siteConfig.update({
        where: { id: config.id },
        data: {
          siteName: body.siteName,
          eventName: body.eventName,
          copyright: body.copyright,
          description: body.description,
          logoUrl: body.logoUrl,
          primaryColor: body.primaryColor,
          secondaryColor: body.secondaryColor,
          textColor: body.textColor,
        },
      });
    }

    await logAudit('CONFIG_UPDATED', 'SiteConfig', config.id, body, request);

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error updating config:', error);
    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    );
  }
}
