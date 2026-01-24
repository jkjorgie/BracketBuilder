// Migration script to assign existing vote sources to campaigns
// Run with: npx tsx scripts/migrate-vote-sources.ts

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.POSTGRES_PRISMA_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function migrateVoteSources() {
  console.log('Starting vote sources migration...');

  // Get all campaigns
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: 'asc' },
  });

  if (campaigns.length === 0) {
    console.log('No campaigns found. Vote sources will remain unassigned.');
    return;
  }

  console.log(`Found ${campaigns.length} campaign(s)`);

  // Get all vote sources without a campaign
  const unassignedSources = await prisma.voteSource.findMany({
    where: { campaignId: null },
  });

  console.log(`Found ${unassignedSources.length} unassigned vote source(s)`);

  if (unassignedSources.length === 0) {
    console.log('No unassigned vote sources. Migration complete.');
    return;
  }

  // For each campaign, create a copy of each vote source
  for (const campaign of campaigns) {
    console.log(`\nProcessing campaign: ${campaign.name} (${campaign.slug})`);

    for (const source of unassignedSources) {
      // Check if this code already exists for this campaign
      const existing = await prisma.voteSource.findFirst({
        where: {
          campaignId: campaign.id,
          code: source.code,
        },
      });

      if (existing) {
        console.log(`  - Skipping ${source.code}: already exists for this campaign`);
        continue;
      }

      // Create new source for this campaign
      await prisma.voteSource.create({
        data: {
          code: source.code,
          name: source.name,
          description: source.description,
          validFrom: source.validFrom,
          validUntil: source.validUntil,
          isActive: source.isActive,
          campaignId: campaign.id,
        },
      });
      console.log(`  - Created ${source.code} for ${campaign.slug}`);
    }
  }

  // Delete the original unassigned sources
  console.log('\nDeleting original unassigned vote sources...');
  await prisma.voteSource.deleteMany({
    where: { campaignId: null },
  });

  console.log('Migration complete!');
}

migrateVoteSources()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
