import { NextRequest } from 'next/server';
import prisma from './db';

export type AuditAction = 
  | 'CAMPAIGN_CREATED'
  | 'CAMPAIGN_UPDATED'
  | 'CAMPAIGN_DELETED'
  | 'CAMPAIGN_ACTIVATED'
  | 'ROUND_STARTED'
  | 'ROUND_COMPLETED'
  | 'MATCHUP_CREATED'
  | 'MATCHUP_DELETED'
  | 'MATCHUP_DELETED_WITH_VOTES'
  | 'MATCHUP_WINNER_SET'
  | 'COMPETITOR_CREATED'
  | 'COMPETITOR_UPDATED'
  | 'COMPETITOR_DELETED'
  | 'COMPETITOR_ELIMINATED'
  | 'VOTE_SUBMITTED'
  | 'VOTE_DELETED'
  | 'VOTE_SOURCE_CREATED'
  | 'VOTE_SOURCE_UPDATED'
  | 'VOTE_SOURCE_DELETED'
  | 'CONFIG_UPDATED';

export async function logAudit(
  action: AuditAction,
  entityType: string,
  entityId: string,
  details?: Record<string, unknown>,
  request?: NextRequest
) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        // Cast to satisfy Prisma's JSON type requirements
        details: details as object | undefined,
        ipAddress: request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip') || null,
        userAgent: request?.headers.get('user-agent') || null,
      },
    });
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    console.error('Failed to log audit:', error);
  }
}
