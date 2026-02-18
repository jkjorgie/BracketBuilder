import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.POSTGRES_PRISMA_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Vote sources to create for the Alliance 2025 campaign
const voteSources = [
  // Sunday - March 8, 2025 (midnight to midnight)
  { code: 'session-6213-keynote', name: '6213 - Lessons from the Phoenix: A Vision and Framework to Ignite Transformation Today', day: 'sunday' },
  { code: 'session-6229-aua', name: '6229 - Ask Us Anything: Solving Enterprise Challenges with GT', day: 'sunday' },
  { code: 'session-6231-userexperience', name: '6231 - Beyond Functionality: Elevating User Experience', day: 'sunday' },
  { code: 'session-6232-aiinvestment', name: '6232 - Beyond the Hype: Why Most Enterprise AI Investments in PeopleSoft Underdeliver (And What Actually Works)', day: 'sunday' },
  { code: 'session-6233-eformscss', name: '6233 - Level Up Your Forms: GT eForms CSS Styling Lab', day: 'sunday' },
  { code: 'session-6247-gt4c', name: '6247 - GT eForms for Cloud: What It Is, How It Works, and When to Use It', day: 'sunday' },
  { code: 'session-6251-gt101', name: '6251 - GT 101: Who the Heck is Gideon Taylor?', day: 'sunday' },
  { code: 'booth-sunday', name: 'Booth Sunday', day: 'sunday' },

  // Monday - March 9, 2025 (midnight to midnight)
  { code: 'session-5589-tnt', name: '5589 - Tips, Tricks, and Tech: Mastering GT eForms', day: 'monday' },
  { code: 'session-5670-oci', name: '5670 - Lift & Shift of PeopleSoft Campus Solutions to Oracle Cloud Infrastructure', day: 'monday' },
  { code: 'session-5917-simplicity', name: '5917 - Complexity is Easy, Simplicity Takes Design', day: 'monday' },
  { code: 'session-5972-multiinstitution', name: '5972 - One Form, Many Campuses: Leveraging Gideon Taylor eForms for Multi-Institutional Workflow Success across the UHS System', day: 'monday' },
  { code: 'session-5974-tempempl', name: '5974 - Hiring Made Easy: Navigating Temporary Employee Processes with Confidence', day: 'monday' },
  { code: 'session-6010-reimbursements', name: '6010 - FastPass to Reimbursements: Automating Student Expense Claims with GT eForms', day: 'monday' },
  { code: 'session-6192-hireform', name: '6192 - Pilot to Production - A Look Behind the Scenes!', day: 'monday' },
  { code: 'session-6204-genai', name: '6204 - How Generative AI Can Promote Self-Advising and Pathway Exploration', day: 'monday' },
  { code: 'session-6205-ucop', name: '6205 - Reimagining the UX with PeopleTools and AI: The UCOP Transformation Story', day: 'monday' },
  { code: 'session-6235-accessibility', name: '6235 - Accessibility in PeopleSoft: Where We Are and How to Close the Gaps', day: 'monday' },
  { code: 'session-6236-roadmap', name: '6236 - The GT Product Roadmap: Where we Are and Where we\'re Going', day: 'monday' },
  { code: 'booth-monday', name: 'Booth Monday', day: 'monday' },

  // Tuesday - March 10, 2025 (midnight to midnight)
  { code: 'session-5388-boaf', name: '5388 - Birds of a Feather: GT eForms', day: 'tuesday' },
  { code: 'session-5740-unpaidappts', name: '5740 - Reduce Your Risk...Don\'t Pay for Unpaid Appointments!', day: 'tuesday' },
  { code: 'session-6025-psai', name: '6025 - Navigating Oracle\'s AI Update for PeopleSoft: New Paths, Real Opportunities', day: 'tuesday' },
  { code: 'session-6105-analytics', name: '6105 - Turning eForms into Insights: Western University\'s Secure Analytics with PeopleSoft', day: 'tuesday' },
  { code: 'session-6131-lowcodeps', name: '6131 - Power Up with Low-Code / No-Code PeopleSoft Config Tools: Page & Field Configurator, Activity Guides, PS Insights, and GT', day: 'tuesday' },
  { code: 'booth-tuesday', name: 'Booth Tuesday', day: 'tuesday' },
];

// Date ranges for each day (midnight to midnight in local time, stored as UTC)
const dayRanges: Record<string, { validFrom: Date; validUntil: Date }> = {
  sunday: {
    validFrom: new Date('2026-03-08T00:00:00'),
    validUntil: new Date('2026-03-09T00:00:00'),
  },
  monday: {
    validFrom: new Date('2026-03-09T00:00:00'),
    validUntil: new Date('2026-03-10T00:00:00'),
  },
  tuesday: {
    validFrom: new Date('2026-03-10T00:00:00'),
    validUntil: new Date('2026-03-11T00:00:00'),
  },
};

async function main() {
  console.log('🔍 Finding non-demo campaign...');
  
  // Find the non-demo campaign
  const campaign = await prisma.campaign.findFirst({
    where: { isDemo: false },
  });

  if (!campaign) {
    console.error('❌ No non-demo campaign found!');
    process.exit(1);
  }

  console.log(`✅ Found campaign: ${campaign.name} (${campaign.slug})`);
  console.log(`\n📝 Creating ${voteSources.length} vote sources...\n`);

  let created = 0;
  let skipped = 0;

  for (const source of voteSources) {
    const { validFrom, validUntil } = dayRanges[source.day];

    // Check if source already exists
    const existing = await prisma.voteSource.findFirst({
      where: {
        campaignId: campaign.id,
        code: source.code,
      },
    });

    if (existing) {
      console.log(`⏭️  Skipping ${source.code} (already exists)`);
      skipped++;
      continue;
    }

    await prisma.voteSource.create({
      data: {
        code: source.code,
        name: source.name,
        campaignId: campaign.id,
        validFrom,
        validUntil,
        isActive: true,
      },
    });

    console.log(`✅ Created: ${source.code}`);
    created++;
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total:   ${voteSources.length}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error('Error:', e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
