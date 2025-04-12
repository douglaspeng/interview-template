'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Invoice } from '@/lib/db/schema';
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';

interface TokenUsageStats {
  totalTokens: number;
  totalCost: number;
  cacheHitRate: number;
  totalRequests: number;
  cacheHits: number;
  savedTokens: number;
  savedCost: number;
}

interface TokenUsageCardsProps {
  invoices: Invoice[];
}

function TokenUsageCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          <Skeleton className="h-4 w-24" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="text-xs text-muted-foreground">
          <Skeleton className="h-3 w-40 mt-2" />
        </div>
      </CardContent>
    </Card>
  );
}

export function TokenUsageCards({ invoices }: TokenUsageCardsProps) {
  const [stats, setStats] = useState<TokenUsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/token-usage/stats');
        if (!response.ok) throw new Error('Failed to fetch token usage stats');
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Error fetching token usage stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [invoices]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <TokenUsageCardSkeleton />
        <TokenUsageCardSkeleton />
        <TokenUsageCardSkeleton />
      </div>
    );
  }

  if (!stats) return null;

  // Calculate average per invoice
  const invoiceCount = invoices.length || 1; // Avoid division by zero
  const avgTokensPerInvoice = stats.totalTokens / invoiceCount;
  const avgCostPerInvoice = stats.totalCost / invoiceCount;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Token Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(stats.totalTokens)} tokens</div>
          <div className="text-xs text-muted-foreground">
            Cost: {formatCurrency(stats.totalCost, 'USD')}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Per Invoice</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(avgTokensPerInvoice)} tokens</div>
          <div className="text-xs text-muted-foreground">
            Avg. Cost: {formatCurrency(avgCostPerInvoice, 'USD')}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cache Savings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(stats.savedTokens)} tokens</div>
          <div className="text-xs text-muted-foreground">
            Saved: {formatCurrency(stats.savedCost, 'USD')}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 