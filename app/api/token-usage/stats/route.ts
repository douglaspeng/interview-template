import { db } from '@/lib/db';
import { tokenUsage } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get total token usage and costs using Drizzle ORM
    const result = await db
      .select({
        totalTokens: sql`cast(sum(${tokenUsage.totalTokens}) as integer)`.mapWith(Number),
        totalCost: sql`cast(sum(${tokenUsage.cost}) as real)`.mapWith(Number),
        totalRequests: sql`cast(count(*) as integer)`.mapWith(Number),
        cacheHits: sql`cast(sum(case when ${tokenUsage.cacheHit} then 1 else 0 end) as integer)`.mapWith(Number),
        // For cached results, use the original token usage and cost
        savedTokens: sql`cast(sum(case when ${tokenUsage.cacheHit} then ${tokenUsage.totalTokens} end) as integer)`.mapWith(Number),
        savedCost: sql`cast(sum(case when ${tokenUsage.cacheHit} then ${tokenUsage.cost} end) as real)`.mapWith(Number)
      })
      .from(tokenUsage);

    const stats = result[0] || {
      totalTokens: 0,
      totalCost: 0,
      totalRequests: 0,
      cacheHits: 0,
      savedTokens: 0,
      savedCost: 0
    };

    return NextResponse.json({
      totalTokens: stats.totalTokens,
      totalCost: stats.totalCost,
      totalRequests: stats.totalRequests,
      cacheHits: stats.cacheHits,
      cacheHitRate: stats.totalRequests ? (stats.cacheHits / stats.totalRequests) * 100 : 0,
      savedTokens: stats.savedTokens,
      savedCost: stats.savedCost
    });
  } catch (error) {
    console.error('Error fetching token usage stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token usage statistics' },
      { status: 500 }
    );
  }
} 