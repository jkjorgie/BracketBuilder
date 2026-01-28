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

async function undoRoundCompletion(campaignSlug: string, roundNumber: number) {
  console.log(`\n🔄 Undoing round ${roundNumber} completion for campaign "${campaignSlug}"...\n`);

  // Get campaign with rounds and matchups
  const campaign = await prisma.campaign.findUnique({
    where: { slug: campaignSlug },
    include: {
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
      competitors: true,
    },
  });

  if (!campaign) {
    console.error(`❌ Campaign "${campaignSlug}" not found!`);
    return;
  }

  const targetRound = campaign.rounds.find(r => r.roundNumber === roundNumber);
  if (!targetRound) {
    console.error(`❌ Round ${roundNumber} not found!`);
    return;
  }

  if (!targetRound.isComplete) {
    console.log(`ℹ️  Round ${roundNumber} is not marked as complete. Nothing to undo.`);
    return;
  }

  console.log(`📋 Current state:`);
  console.log(`   Campaign current round: ${campaign.currentRound}`);
  console.log(`   Round ${roundNumber}: isActive=${targetRound.isActive}, isComplete=${targetRound.isComplete}`);
  console.log(`   Matchups in round ${roundNumber}:`);
  
  for (const matchup of targetRound.matchups) {
    console.log(`     - ${matchup.competitor1?.name || 'TBD'} vs ${matchup.competitor2?.name || 'TBD'} → Winner: ${matchup.winner?.name || 'none'}`);
  }

  const nextRound = campaign.rounds.find(r => r.roundNumber === roundNumber + 1);
  if (nextRound) {
    console.log(`   Round ${roundNumber + 1}: isActive=${nextRound.isActive}, isComplete=${nextRound.isComplete}`);
    console.log(`   Matchups in round ${roundNumber + 1}:`);
    for (const matchup of nextRound.matchups) {
      console.log(`     - ${matchup.competitor1?.name || 'TBD'} vs ${matchup.competitor2?.name || 'TBD'}`);
    }
  }

  // Find competitors eliminated in this round
  const eliminatedCompetitors = campaign.competitors.filter(c => c.eliminatedInRound === roundNumber);
  console.log(`   Eliminated in round ${roundNumber}: ${eliminatedCompetitors.map(c => c.name).join(', ') || 'none'}`);

  console.log(`\n🔧 Reverting changes...`);

  await prisma.$transaction(async (tx) => {
    // 1. Mark round as active and not complete
    await tx.round.update({
      where: { id: targetRound.id },
      data: { isActive: true, isComplete: false },
    });
    console.log(`   ✅ Round ${roundNumber} marked as active and not complete`);

    // 2. Clear winners from matchups in this round
    for (const matchup of targetRound.matchups) {
      await tx.matchup.update({
        where: { id: matchup.id },
        data: { winnerId: null },
      });
    }
    console.log(`   ✅ Cleared winners from ${targetRound.matchups.length} matchups`);

    // 3. Un-eliminate competitors
    for (const competitor of eliminatedCompetitors) {
      await tx.competitor.update({
        where: { id: competitor.id },
        data: { isEliminated: false, eliminatedInRound: null },
      });
    }
    console.log(`   ✅ Un-eliminated ${eliminatedCompetitors.length} competitors`);

    // 4. If next round exists, deactivate it and clear its competitors
    if (nextRound) {
      await tx.round.update({
        where: { id: nextRound.id },
        data: { isActive: false },
      });
      console.log(`   ✅ Round ${roundNumber + 1} deactivated`);

      // Clear competitors from next round matchups
      for (const matchup of nextRound.matchups) {
        await tx.matchup.update({
          where: { id: matchup.id },
          data: { competitor1Id: null, competitor2Id: null },
        });
      }
      console.log(`   ✅ Cleared competitors from ${nextRound.matchups.length} matchups in round ${roundNumber + 1}`);
    }

    // 5. Update campaign current round
    await tx.campaign.update({
      where: { id: campaign.id },
      data: { currentRound: roundNumber },
    });
    console.log(`   ✅ Campaign current round set to ${roundNumber}`);
  });

  console.log(`\n✅ Successfully reverted round ${roundNumber} completion!\n`);
}

// Run the undo for unit-testing campaign, round 1
undoRoundCompletion('unit-testing', 1)
  .catch((e) => {
    console.error('❌ Failed to undo round completion:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
