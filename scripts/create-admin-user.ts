import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

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

/**
 * Generate a secure random password
 * Format: word-word-number (easy to type, secure enough)
 */
function generateSecurePassword(): string {
  const randomBytes = crypto.randomBytes(12);
  const password = randomBytes.toString('base64')
    .replace(/[+/=]/g, '')
    .substring(0, 16);
  
  // Make it more memorable with dashes
  return `${password.substring(0, 6)}-${password.substring(6, 12)}-${password.substring(12)}`;
}

async function createAdminUser(email: string, name: string) {
  console.log(`\n🔧 Creating admin user for ${name}...`);
  
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.error(`❌ User with email ${email} already exists!`);
    return null;
  }

  // Generate password
  const password = generateSecurePassword();
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      role: 'admin',
      isActive: true,
    },
  });

  console.log('✅ Admin user created successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`👤 Name: ${name}`);
  console.log(`📧 Email: ${email}`);
  console.log(`🔑 Password: ${password}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n⚠️  IMPORTANT: Save this password securely! It cannot be retrieved later.\n');

  return { user, password };
}

async function main() {
  const result = await createAdminUser(
    'jrussell@gideontaylor.com',
    'Jay Russell'
  );

  if (!result) {
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('❌ Failed to create admin user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
