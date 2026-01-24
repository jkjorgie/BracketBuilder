import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

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
  console.log('Starting Feature Face Off database seed...');

  // Clear existing data
  console.log('🧹 Clearing existing data...');
  await prisma.session.deleteMany();
  await prisma.vote.deleteMany();
  await prisma.matchup.deleteMany();
  await prisma.round.deleteMany();
  await prisma.competitor.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.voteSource.deleteMany();
  await prisma.siteConfig.deleteMany();
  await prisma.user.deleteMany();
  await prisma.auditLog.deleteMany();

  // ============================================================================
  // CREATE ADMIN USER
  // ============================================================================
  console.log('👤 Creating admin user...');
  const passwordHash = await bcrypt.hash('vecrir-Teqxy1-cynfaf', 12);
  await prisma.user.create({
    data: {
      email: 'jay@gideontaylor.com',
      passwordHash,
      name: 'Jay Jorgensen',
      role: 'admin',
      isActive: true,
    },
  });

  // ============================================================================
  // SITE CONFIGURATION - March Madness Theme
  // ============================================================================
  console.log('⚙️  Creating site configuration...');
  await prisma.siteConfig.create({
    data: {
      siteName: 'GT eForms Feature Face Off',
      eventName: 'Alliance 2026',
      copyright: 'Jay Jorgensen',
      description: 'It\'s March Madness for product features! Fill out your bracket and help us decide which GT eForms feature advances to the next round. Every vote counts in this tournament-style showdown!',
      primaryColor: '#FF9E18',
      secondaryColor: '#00B2E3',
      textColor: '#231F20',
      isActive: true,
    },
  });

  // ============================================================================
  // VOTE SOURCES - 10 per day for 3 days (30 total)
  // ============================================================================
  console.log('🔗 Creating vote sources...');
  
  // Day 1 sources (Monday, Jan 26)
  const day1Sources = [
    { code: 'booth-day1', name: 'Booth - Monday', description: 'Visit the GT booth on Monday to cast your bracket!' },
    { code: 'day1-keynote', name: 'Monday Keynote', description: 'Monday Keynote Session' },
    { code: 'day1-workshop1', name: 'Workshop 1A', description: 'Monday Workshop 1A' },
    { code: 'day1-workshop2', name: 'Workshop 1B', description: 'Monday Workshop 1B' },
    { code: 'day1-workshop3', name: 'Workshop 1C', description: 'Monday Workshop 1C' },
    { code: 'day1-breakout1', name: 'Breakout 1A', description: 'Monday Breakout Session 1A' },
    { code: 'day1-breakout2', name: 'Breakout 1B', description: 'Monday Breakout Session 1B' },
    { code: 'day1-demo1', name: 'Demo 1', description: 'Monday Product Demo 1' },
    { code: 'day1-lunch', name: 'Lunch & Learn', description: 'Monday Lunch & Learn Session' },
    { code: 'day1-networking', name: 'Networking Hour', description: 'Monday Networking Reception' },
  ];

  // Day 2 sources (Tuesday, Jan 27)
  const day2Sources = [
    { code: 'booth-day2', name: 'Booth - Tuesday', description: 'Visit the GT booth on Tuesday to cast your bracket!' },
    { code: 'day2-keynote', name: 'Tuesday Keynote', description: 'Tuesday Keynote Session' },
    { code: 'day2-workshop1', name: 'Workshop 2A', description: 'Tuesday Workshop 2A' },
    { code: 'day2-workshop2', name: 'Workshop 2B', description: 'Tuesday Workshop 2B' },
    { code: 'day2-workshop3', name: 'Workshop 2C', description: 'Tuesday Workshop 2C' },
    { code: 'day2-breakout1', name: 'Breakout 2A', description: 'Tuesday Breakout Session 2A' },
    { code: 'day2-breakout2', name: 'Breakout 2B', description: 'Tuesday Breakout Session 2B' },
    { code: 'day2-demo1', name: 'Demo 2', description: 'Tuesday Product Demo 2' },
    { code: 'day2-lunch', name: 'Lunch & Learn', description: 'Tuesday Lunch & Learn Session' },
    { code: 'day2-networking', name: 'Happy Hour', description: 'Tuesday Happy Hour' },
  ];

  // Day 3 sources (Wednesday, Jan 28)
  const day3Sources = [
    { code: 'booth-day3', name: 'Booth - Wednesday', description: 'Visit the GT booth on Wednesday to cast your bracket!' },
    { code: 'day3-keynote', name: 'Wednesday Keynote', description: 'Wednesday Keynote Session' },
    { code: 'day3-workshop1', name: 'Workshop 3A', description: 'Wednesday Workshop 3A' },
    { code: 'day3-workshop2', name: 'Workshop 3B', description: 'Wednesday Workshop 3B' },
    { code: 'day3-workshop3', name: 'Workshop 3C', description: 'Wednesday Workshop 3C' },
    { code: 'day3-breakout1', name: 'Breakout 3A', description: 'Wednesday Breakout Session 3A' },
    { code: 'day3-breakout2', name: 'Breakout 3B', description: 'Wednesday Breakout Session 3B' },
    { code: 'day3-demo1', name: 'Demo 3', description: 'Wednesday Product Demo 3' },
    { code: 'day3-closing', name: 'Closing Session', description: 'Wednesday Closing & Awards' },
    { code: 'day3-farewell', name: 'Farewell Event', description: 'Wednesday Farewell Reception' },
  ];

  // Create all vote sources with validity periods
  const monday = new Date('2026-01-26T00:00:00');
  const tuesday = new Date('2026-01-27T00:00:00');
  const wednesday = new Date('2026-01-28T00:00:00');
  const endMonday = new Date('2026-01-26T23:59:59');
  const endTuesday = new Date('2026-01-27T23:59:59');
  const endWednesday = new Date('2026-01-28T23:59:59');

  for (const source of day1Sources) {
    await prisma.voteSource.create({
      data: { ...source, validFrom: monday, validUntil: endMonday, isActive: true },
    });
  }
  for (const source of day2Sources) {
    await prisma.voteSource.create({
      data: { ...source, validFrom: tuesday, validUntil: endTuesday, isActive: true },
    });
  }
  for (const source of day3Sources) {
    await prisma.voteSource.create({
      data: { ...source, validFrom: wednesday, validUntil: endWednesday, isActive: true },
    });
  }

  // Also create a direct source that's always valid
  await prisma.voteSource.create({
    data: {
      code: 'direct',
      name: 'Direct Link',
      description: 'Direct access to voting page',
      isActive: true,
    },
  });

  // ============================================================================
  // DEMO CAMPAIGN - alliance2026demo1 (Mon-Wed next week)
  // ============================================================================
  console.log('🏆 Creating demo campaign: alliance2026demo1...');
  
  const campaign = await prisma.campaign.create({
    data: {
      name: 'Feature Face Off - March Madness Edition',
      description: 'Welcome to the ultimate feature showdown! Just like March Madness, your vote helps decide which GT eForms features advance. Fill out your bracket each day as the competition heats up!',
      slug: 'alliance2026demo1',
      isDemo: true,
      isActive: true,
      startDate: monday,
      endDate: endWednesday,
      currentRound: 1,
    },
  });

  // ============================================================================
  // COMPETITORS (8 features for a proper bracket)
  // ============================================================================
  console.log('⭐ Creating competitors...');
  const competitorData = [
    {
      name: 'Dark Mode',
      description: 'System-wide dark theme support for reduced eye strain and better battery life. A fan favorite going into the tournament!',
      seed: 1,
    },
    {
      name: 'Mobile App',
      description: 'Native mobile application for iOS and Android with full feature parity. The #2 seed is looking strong this year!',
      seed: 2,
    },
    {
      name: 'Real-time Collaboration',
      description: 'Live collaboration features enabling multiple users to work on the same document simultaneously. A solid #3 seed with upset potential.',
      seed: 3,
    },
    {
      name: 'Offline Mode',
      description: 'Full offline functionality allowing users to work without an internet connection. The #4 seed that could make a deep run!',
      seed: 4,
    },
    {
      name: 'Custom Dashboards',
      description: 'Personalized dashboard builder with drag-and-drop widgets and customizable layouts. The #5 seed looking to prove the doubters wrong.',
      seed: 5,
    },
    {
      name: 'Advanced Analytics',
      description: 'Comprehensive analytics dashboard with predictive insights and custom reporting. A #6 seed with Cinderella story potential.',
      seed: 6,
    },
    {
      name: 'API Integrations',
      description: 'Extensive third-party API integrations with popular tools and services. The #7 seed that could surprise everyone.',
      seed: 7,
    },
    {
      name: 'AI Assistant',
      description: 'Intelligent AI-powered assistant to help users navigate and complete tasks more efficiently. The #8 seed wildcard!',
      seed: 8,
    },
  ];

  const competitors: Record<number, string> = {};
  for (const data of competitorData) {
    const competitor = await prisma.competitor.create({
      data: {
        ...data,
        campaignId: campaign.id,
      },
    });
    competitors[data.seed] = competitor.id;
  }

  // ============================================================================
  // ROUNDS - One round per day
  // Round 1 (Monday): Quarterfinals - 4 matchups, 8 → 4
  // Round 2 (Tuesday): Semifinals - 2 matchups, 4 → 2
  // Round 3 (Wednesday): Finals - 1 matchup, 2 → 1 Champion
  // ============================================================================
  console.log('📅 Creating rounds (one per day)...');
  
  // Note: Round 1 starts INACTIVE - will be activated on Monday Jan 26
  const round1 = await prisma.round.create({
    data: {
      roundNumber: 1,
      name: 'Quarterfinals',
      campaignId: campaign.id,
      isActive: false, // Will be activated when voting opens Monday
      isComplete: false,
      startDate: monday,
      endDate: endMonday,
    },
  });

  const round2 = await prisma.round.create({
    data: {
      roundNumber: 2,
      name: 'Semifinals',
      campaignId: campaign.id,
      isActive: false,
      isComplete: false,
      startDate: tuesday,
      endDate: endTuesday,
    },
  });

  const round3 = await prisma.round.create({
    data: {
      roundNumber: 3,
      name: 'Championship',
      campaignId: campaign.id,
      isActive: false,
      isComplete: false,
      startDate: wednesday,
      endDate: endWednesday,
    },
  });

  // ============================================================================
  // MATCHUPS
  // ============================================================================
  console.log('⚔️  Creating matchups...');
  
  // Round 1: Traditional bracket seeding 1v8, 4v5, 3v6, 2v7
  const r1Matchups = [
    [1, 8], // Dark Mode vs AI Assistant
    [4, 5], // Offline Mode vs Custom Dashboards
    [3, 6], // Real-time Collaboration vs Advanced Analytics
    [2, 7], // Mobile App vs API Integrations
  ];

  for (let i = 0; i < r1Matchups.length; i++) {
    await prisma.matchup.create({
      data: {
        matchupIndex: i,
        roundId: round1.id,
        campaignId: campaign.id,
        competitor1Id: competitors[r1Matchups[i][0]],
        competitor2Id: competitors[r1Matchups[i][1]],
      },
    });
  }

  // Round 2: Empty matchups (winners of R1 matchup 0&1 meet, winners of R1 matchup 2&3 meet)
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

  // Round 3: Championship matchup (empty)
  await prisma.matchup.create({
    data: {
      matchupIndex: 0,
      roundId: round3.id,
      campaignId: campaign.id,
      competitor1Id: null,
      competitor2Id: null,
    },
  });

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n🎉 Seed completed successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👤 Admin User: jay@gideontaylor.com');
  console.log('🔑 Password: vecrir-Teqxy1-cynfaf');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📋 Campaign: ${campaign.name}`);
  console.log(`   Slug: ${campaign.slug}`);
  console.log(`   Demo Mode: ${campaign.isDemo}`);
  console.log(`   Active: ${campaign.isActive}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📅 Schedule:');
  console.log('   Monday (Jan 26): Quarterfinals - 8 features compete');
  console.log('   Tuesday (Jan 27): Semifinals - 4 features compete');
  console.log('   Wednesday (Jan 28): Championship - Final 2 compete');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔗 Vote Sources: 31 total (10 per day + direct)');
  console.log('   Day 1 (Monday): booth-day1, day1-keynote, etc.');
  console.log('   Day 2 (Tuesday): booth-day2, day2-keynote, etc.');
  console.log('   Day 3 (Wednesday): booth-day3, day3-keynote, etc.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Ready for March Madness-style voting!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
