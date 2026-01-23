import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// Create PostgreSQL pool
const pool = new pg.Pool({
  connectionString: process.env.POSTGRES_PRISMA_URL,
});

// Create adapter
const adapter = new PrismaPg(pool);

// Create Prisma client with adapter
const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  console.log('🧹 Clearing existing data...');
  await prisma.vote.deleteMany();
  await prisma.matchup.deleteMany();
  await prisma.round.deleteMany();
  await prisma.competitor.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.voteSource.deleteMany();
  await prisma.siteConfig.deleteMany();

  // Create site configuration
  console.log('⚙️  Creating site configuration...');
  await prisma.siteConfig.create({
    data: {
      siteName: 'GT eForms Feature Face Off',
      eventName: 'Alliance 2026',
      copyright: 'Jay Jorgensen',
      description: 'Help us decide which GT eForms feature to build next! Vote for your favorites at Alliance 2026.',
      primaryColor: '#FF9E18',
      secondaryColor: '#00B2E3',
      textColor: '#231F20',
      isActive: true,
    },
  });

  // Create vote sources
  console.log('🔗 Creating vote sources...');
  const voteSources = [
    { code: 'direct', name: 'Direct Link', description: 'Direct access to voting page' },
    { code: 'boothday1', name: 'Booth - Day 1', description: 'Alliance 2026 booth visit on Day 1' },
    { code: 'boothday2', name: 'Booth - Day 2', description: 'Alliance 2026 booth visit on Day 2' },
    { code: 'boothday3', name: 'Booth - Day 3', description: 'Alliance 2026 booth visit on Day 3' },
    { code: 'session1', name: 'Session 1', description: 'GT Session 1 at Alliance 2026' },
    { code: 'session2', name: 'Session 2', description: 'GT Session 2 at Alliance 2026' },
    { code: 'session3', name: 'Session 3', description: 'GT Session 3 at Alliance 2026' },
  ];

  for (const source of voteSources) {
    await prisma.voteSource.create({ data: source });
  }

  // Create the main campaign
  console.log('📋 Creating campaign...');
  const campaign = await prisma.campaign.create({
    data: {
      name: 'GT eForms Feature Face Off',
      description: 'Help us decide which GT eForms feature to build next! Vote for your favorites at Alliance 2026.',
      slug: 'alliance-2026',
      isDemo: false,
      isActive: true,
      startDate: new Date('2026-01-22'),
      endDate: new Date('2026-01-24'),
      currentRound: 1,
    },
  });

  // Create competitors (features)
  console.log('🏆 Creating competitors...');
  const competitorData = [
    {
      name: 'Dark Mode',
      description: 'System-wide dark theme support for reduced eye strain and better battery life on OLED screens.',
      seed: 1,
    },
    {
      name: 'AI Assistant',
      description: 'Intelligent AI-powered assistant to help users navigate and complete tasks more efficiently.',
      seed: 8,
    },
    {
      name: 'Offline Mode',
      description: 'Full offline functionality allowing users to work without an internet connection.',
      seed: 4,
    },
    {
      name: 'Custom Dashboards',
      description: 'Personalized dashboard builder with drag-and-drop widgets and customizable layouts.',
      seed: 5,
    },
    {
      name: 'Real-time Collaboration',
      description: 'Live collaboration features enabling multiple users to work on the same document simultaneously.',
      seed: 3,
    },
    {
      name: 'Advanced Analytics',
      description: 'Comprehensive analytics dashboard with predictive insights and custom reporting.',
      seed: 6,
    },
    {
      name: 'Mobile App',
      description: 'Native mobile application for iOS and Android with full feature parity.',
      seed: 2,
    },
    {
      name: 'API Integrations',
      description: 'Extensive third-party API integrations with popular tools and services.',
      seed: 7,
    },
  ];

  const competitors: Record<number, string> = {}; // seed -> id mapping
  
  for (const data of competitorData) {
    const competitor = await prisma.competitor.create({
      data: {
        ...data,
        campaignId: campaign.id,
      },
    });
    competitors[data.seed] = competitor.id;
  }

  // Create rounds
  console.log('🔄 Creating rounds...');
  const round1 = await prisma.round.create({
    data: {
      roundNumber: 1,
      name: 'Quarterfinals',
      campaignId: campaign.id,
      isActive: true,
      isComplete: false,
      startDate: new Date('2026-01-22'),
      endDate: new Date('2026-01-22'),
    },
  });

  const round2 = await prisma.round.create({
    data: {
      roundNumber: 2,
      name: 'Semifinals',
      campaignId: campaign.id,
      isActive: false,
      isComplete: false,
      startDate: new Date('2026-01-23'),
      endDate: new Date('2026-01-23'),
    },
  });

  const round3 = await prisma.round.create({
    data: {
      roundNumber: 3,
      name: 'Finals',
      campaignId: campaign.id,
      isActive: false,
      isComplete: false,
      startDate: new Date('2026-01-24'),
      endDate: new Date('2026-01-24'),
    },
  });

  // Create matchups for Round 1 (Quarterfinals)
  // Traditional bracket seeding: 1v8, 4v5, 3v6, 2v7
  console.log('⚔️  Creating matchups...');
  const seedPairs = [
    [1, 8], // Dark Mode vs API Integrations
    [4, 5], // Offline Mode vs Custom Dashboards
    [3, 6], // Real-time Collaboration vs Advanced Analytics
    [2, 7], // Mobile App vs AI Assistant
  ];

  for (let i = 0; i < seedPairs.length; i++) {
    await prisma.matchup.create({
      data: {
        matchupIndex: i,
        roundId: round1.id,
        campaignId: campaign.id,
        competitor1Id: competitors[seedPairs[i][0]],
        competitor2Id: competitors[seedPairs[i][1]],
      },
    });
  }

  // Create empty matchups for Round 2 (Semifinals)
  for (let i = 0; i < 2; i++) {
    await prisma.matchup.create({
      data: {
        matchupIndex: i,
        roundId: round2.id,
        campaignId: campaign.id,
        competitor1Id: null,
        competitor2Id: null,
      },
    });
  }

  // Create empty matchup for Round 3 (Finals)
  await prisma.matchup.create({
    data: {
      matchupIndex: 0,
      roundId: round3.id,
      campaignId: campaign.id,
      competitor1Id: null,
      competitor2Id: null,
    },
  });

  // Create a demo campaign as well
  console.log('🎭 Creating demo campaign...');
  const demoCampaign = await prisma.campaign.create({
    data: {
      name: 'Demo Bracket',
      description: 'A demo campaign for testing purposes.',
      slug: 'demo',
      isDemo: true,
      isActive: false,
      currentRound: 1,
    },
  });

  // Create demo competitors
  const demoCompetitors: Record<number, string> = {};
  for (const data of competitorData) {
    const competitor = await prisma.competitor.create({
      data: {
        ...data,
        campaignId: demoCampaign.id,
      },
    });
    demoCompetitors[data.seed] = competitor.id;
  }

  // Create demo round 1
  const demoRound1 = await prisma.round.create({
    data: {
      roundNumber: 1,
      name: 'Quarterfinals',
      campaignId: demoCampaign.id,
      isActive: true,
      isComplete: false,
    },
  });

  // Create demo matchups
  for (let i = 0; i < seedPairs.length; i++) {
    await prisma.matchup.create({
      data: {
        matchupIndex: i,
        roundId: demoRound1.id,
        campaignId: demoCampaign.id,
        competitor1Id: demoCompetitors[seedPairs[i][0]],
        competitor2Id: demoCompetitors[seedPairs[i][1]],
      },
    });
  }

  console.log('✅ Seed completed successfully!');
  console.log(`   - Created site configuration`);
  console.log(`   - Created ${voteSources.length} vote sources`);
  console.log(`   - Created campaign: ${campaign.name} (slug: ${campaign.slug})`);
  console.log(`   - Created ${competitorData.length} competitors`);
  console.log(`   - Created 3 rounds with matchups`);
  console.log(`   - Created demo campaign: ${demoCampaign.name} (slug: ${demoCampaign.slug})`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
