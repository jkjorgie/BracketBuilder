import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Get the auth secret from environment
const AUTH_SECRET = process.env.AUTH_SECRET;

if (!AUTH_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('AUTH_SECRET environment variable is required in production');
}

/**
 * Validates the authorization header against the AUTH_SECRET
 * Use this to protect admin API routes
 */
export function validateAuthHeader(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader) {
    return false;
  }

  // Support both "Bearer <token>" and just "<token>" formats
  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : authHeader;

  // Use timing-safe comparison to prevent timing attacks
  if (!AUTH_SECRET) {
    // In development without AUTH_SECRET, allow all requests
    console.warn('AUTH_SECRET not set - allowing request in development mode');
    return process.env.NODE_ENV === 'development';
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(AUTH_SECRET)
    );
  } catch {
    return false;
  }
}

/**
 * Middleware helper to protect API routes
 * Returns an error response if auth fails, null if auth succeeds
 */
export function requireAuth(request: NextRequest): NextResponse | null {
  if (!validateAuthHeader(request)) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Invalid or missing authorization token' },
      { status: 401 }
    );
  }
  return null;
}

/**
 * Generate a secure random auth secret
 * Run this once to generate your AUTH_SECRET
 */
export function generateAuthSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a value for safe logging/comparison
 */
export function hashForLog(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 8);
}
