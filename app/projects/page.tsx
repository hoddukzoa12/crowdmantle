'use client';

/**
 * Projects/Campaigns List Page
 * Displays all on-chain campaigns from CrowdfundingEscrow contract
 */

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  getAllCampaigns,
  formatCampaignForDisplay,
  type CampaignData,
} from '@/lib/contracts/escrow';
import { toEther } from 'thirdweb/utils';
import { Search, ArrowUpDown, Plus, RefreshCw } from 'lucide-react';

type CampaignWithId = CampaignData & { id: number };
type StatusFilter = 'all' | 'active' | 'funded' | 'failed';
type SortOption = 'deadline' | 'progress' | 'newest' | 'amount';

export default function ProjectsPage() {
  const [campaigns, setCampaigns] = useState<CampaignWithId[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('deadline');

  // Fetch campaigns from contract
  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const data = await getAllCampaigns();
      setCampaigns(data);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Filter and sort campaigns
  const filteredCampaigns = useMemo(() => {
    let result = [...campaigns];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.tokenSymbol.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((c) => {
        const formatted = formatCampaignForDisplay(c);
        if (statusFilter === 'active') return !formatted.isEnded;
        if (statusFilter === 'funded') return formatted.isEnded && formatted.isSuccessful;
        if (statusFilter === 'failed') return formatted.isEnded && !formatted.isSuccessful;
        return true;
      });
    }

    // Sort
    result.sort((a, b) => {
      const formattedA = formatCampaignForDisplay(a);
      const formattedB = formatCampaignForDisplay(b);

      switch (sortBy) {
        case 'deadline':
          return Number(a.endAt) - Number(b.endAt);
        case 'progress':
          return formattedB.progress - formattedA.progress;
        case 'newest':
          return Number(b.startAt) - Number(a.startAt);
        case 'amount':
          return Number(b.pledged) - Number(a.pledged);
        default:
          return 0;
      }
    });

    return result;
  }, [campaigns, searchQuery, statusFilter, sortBy]);

  // Stats
  const activeCount = campaigns.filter((c) => {
    const formatted = formatCampaignForDisplay(c);
    return !formatted.isEnded;
  }).length;

  const totalRaised = campaigns.reduce((sum, c) => sum + c.pledged, BigInt(0));

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/20">
        <div className="border-b bg-background">
          <div className="container mx-auto px-4 py-8">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="container mx-auto px-4 py-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <Skeleton className="aspect-video rounded-t-lg" />
                <CardHeader>
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-6 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-2 w-full mb-4" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Investment Campaigns</h1>
              <p className="text-muted-foreground mt-2">
                Invest in promising startups and receive equity tokens
              </p>
            </div>
            <div className="flex gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{activeCount}</div>
                <div className="text-muted-foreground">Active</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Number(toEther(totalRaised)).toLocaleString()}
                </div>
                <div className="text-muted-foreground">Total Raised (MNT)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{campaigns.length}</div>
                <div className="text-muted-foreground">Campaigns</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              {/* Status Filter */}
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as StatusFilter)}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="funded">Funded</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-[140px]">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deadline">Ending Soon</SelectItem>
                  <SelectItem value="progress">By Progress</SelectItem>
                  <SelectItem value="amount">By Amount</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                </SelectContent>
              </Select>

              {/* Refresh */}
              <Button variant="outline" size="icon" onClick={fetchCampaigns}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Create Campaign Button */}
          <Button asChild>
            <Link href="/project/create">
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Link>
          </Button>
        </div>

        {/* Results Count */}
        <div className="text-sm text-muted-foreground mb-4">
          {filteredCampaigns.length} campaign{filteredCampaigns.length !== 1 ? 's' : ''} found
        </div>

        {/* Campaigns Grid */}
        {filteredCampaigns.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🚀</div>
            <h3 className="text-lg font-semibold mb-2">
              {campaigns.length === 0 ? 'No campaigns yet' : 'No results found'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {campaigns.length === 0
                ? 'Be the first to create a crowdfunding campaign!'
                : 'Try different search terms or filters'}
            </p>
            {campaigns.length === 0 && (
              <Button asChild>
                <Link href="/project/create">Create Campaign</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCampaigns.map((campaign) => {
              const formatted = formatCampaignForDisplay(campaign);

              return (
                <Card
                  key={campaign.id}
                  className="group hover:border-primary/50 transition-all hover:shadow-lg"
                >
                  {/* Image Placeholder */}
                  <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center rounded-t-lg">
                    <div className="text-6xl">🚀</div>
                  </div>

                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">#{campaign.id}</Badge>
                      <Badge variant="secondary">{campaign.tokenSymbol}</Badge>
                      {formatted.isEnded ? (
                        formatted.isSuccessful ? (
                          <Badge className="bg-green-500">Funded</Badge>
                        ) : (
                          <Badge variant="destructive">Failed</Badge>
                        )
                      ) : (
                        <>
                          <Badge variant="outline" className="text-blue-600 border-blue-300">
                            Active
                          </Badge>
                          {formatted.daysRemaining <= 7 && formatted.daysRemaining > 0 && (
                            <Badge variant="destructive">D-{formatted.daysRemaining}</Badge>
                          )}
                        </>
                      )}
                    </div>
                    <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                      <Link href={`/campaign/${campaign.id}`}>{campaign.name}</Link>
                    </CardTitle>
                    <CardDescription className="line-clamp-1">
                      by {campaign.creator.slice(0, 6)}...{campaign.creator.slice(-4)}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Funding Progress */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium">
                          {Number(toEther(campaign.pledged)).toLocaleString()} MNT
                        </span>
                        <span className="text-muted-foreground">
                          Goal {Number(toEther(campaign.goal)).toLocaleString()} MNT
                        </span>
                      </div>
                      <Progress value={formatted.progress} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{formatted.progress}% funded</span>
                        <span>
                          {formatted.isEnded
                            ? 'Ended'
                            : `${formatted.daysRemaining} days left`}
                        </span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                      <div className="text-center">
                        <div className="text-sm font-semibold">{campaign.tokenSymbol}</div>
                        <div className="text-xs text-muted-foreground">Token</div>
                      </div>
                      <div className="text-center border-x">
                        <div className="text-sm font-semibold">1:1</div>
                        <div className="text-xs text-muted-foreground">MNT Ratio</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-semibold">
                          {formatted.isEnded
                            ? formatted.isSuccessful
                              ? '✓'
                              : '✗'
                            : `D-${formatted.daysRemaining}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatted.isEnded ? 'Status' : 'Remaining'}
                        </div>
                      </div>
                    </div>

                    {/* CTA */}
                    <Button asChild className="w-full">
                      <Link href={`/campaign/${campaign.id}`}>
                        {!formatted.isEnded ? 'Invest Now' : 'View Details'}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
