#!/usr/bin/env node

/**
 * Generate a secure AUTH_SECRET for the application
 * 
 * Usage: node scripts/generate-auth-secret.js
 * 
 * Add the output to your .env file:
 * AUTH_SECRET=<generated-secret>
 */

const crypto = require('crypto');

const secret = crypto.randomBytes(32).toString('hex');

console.log('\n🔐 Generated AUTH_SECRET:\n');
console.log(`AUTH_SECRET=${secret}`);
console.log('\n📋 Copy the line above to your .env file\n');
console.log('⚠️  Keep this secret safe and never commit it to version control!\n');
