"use client";

import { useState, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConnectButtonWrapper } from "@/components/wallet/connect-button-wrapper";
import {
  getAllCampaigns,
  getCampaignsByInvestor,
  getCampaignsByCreator,
  formatCampaignForDisplay,
  type CampaignData,
} from "@/lib/contracts/escrow";
import { toEther } from "thirdweb/utils";

// Unified type - hasMilestones field from contract differentiates campaign types
type CampaignWithId = CampaignData & { id: number };
type InvestedCampaign = CampaignWithId & { pledgeAmount: bigint };

export default function DashboardPage() {
  const account = useActiveAccount();
  const [campaigns, setCampaigns] = useState<CampaignWithId[]>([]);
  const [investedCampaigns, setInvestedCampaigns] = useState<InvestedCampaign[]>([]);
  const [createdCampaigns, setCreatedCampaigns] = useState<CampaignWithId[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!account?.address) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Unified contract: MilestoneEscrow handles both regular and milestone campaigns
        // Campaign type is differentiated by hasMilestones field
        const [allCampaigns, invested, created] = await Promise.all([
          getAllCampaigns(),
          getCampaignsByInvestor(account.address),
          getCampaignsByCreator(account.address),
        ]);

        setCampaigns(allCampaigns);
        setInvestedCampaigns(invested);
        setCreatedCampaigns(created);
      } catch (error) {
        console.error("Failed to fetch campaigns:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [account?.address]);

  // Calculate portfolio stats
  const totalPledged = investedCampaigns.reduce(
    (sum, campaign) => sum + campaign.pledgeAmount,
    BigInt(0)
  );

  // If not connected, show connect button
  if (!account) {
    return (
      <div className="min-h-screen bg-muted/20">
        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-md text-center">
            <div className="text-6xl mb-6">🔐</div>
            <h1 className="text-2xl font-bold mb-4">Connect Your Wallet</h1>
            <p className="text-muted-foreground mb-6">
              Connect your wallet to view your investment portfolio.
            </p>
            <ConnectButtonWrapper />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold">My Portfolio</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {account.address.slice(0, 6)}...{account.address.slice(-4)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/project/create">Create Project</Link>
              </Button>
              <Button asChild>
                <Link href="/projects">Browse Projects</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Portfolio Summary */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Pledged</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">
                  {toEther(totalPledged)} <span className="text-base text-muted-foreground">MNT</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>My Investments</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-2xl font-bold">{investedCampaigns.length}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>My Projects</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-2xl font-bold">{createdCampaigns.length}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-2xl font-bold">{campaigns.length}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* My Investments */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>My Investments</CardTitle>
            <CardDescription>Campaigns you have pledged to</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))}
              </div>
            ) : investedCampaigns.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">📊</div>
                <h3 className="font-semibold mb-2">No investments yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Invest in various startups to receive equity tokens after funding succeeds
                </p>
                <Button asChild>
                  <Link href="/projects">Browse Projects</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {investedCampaigns.map((campaign) => {
                  const formatted = formatCampaignForDisplay(campaign);
                  // All campaigns use unified /campaign/:id route
                  const campaignUrl = `/campaign/${campaign.id}`;
                  return (
                    <div
                      key={campaign.id}
                      className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      {/* Icon */}
                      <div className={`h-12 w-12 rounded-lg flex items-center justify-center text-2xl ${
                        campaign.hasMilestones ? 'bg-green-100 dark:bg-green-900/30' : 'bg-primary/10'
                      }`}>
                        {campaign.hasMilestones ? '🎯' : '💰'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={campaignUrl}
                            className="font-medium hover:text-primary truncate"
                          >
                            {campaign.name}
                          </Link>
                          <Badge variant="outline">
                            {campaign.tokenSymbol}
                          </Badge>
                          {campaign.hasMilestones && (
                            <Badge className="bg-green-600">Milestone</Badge>
                          )}
                          {formatted.isEnded && formatted.isSuccessful && (
                            <Badge className="bg-green-500">Funded</Badge>
                          )}
                          {formatted.isEnded && !formatted.isSuccessful && (
                            <Badge variant="destructive">Failed</Badge>
                          )}
                          {!formatted.isEnded && (
                            <Badge variant="secondary">Active</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {formatted.progress}% funded · {formatted.daysRemaining} days remaining
                        </div>
                      </div>

                      {/* Pledge Amount */}
                      <div className="text-right">
                        <div className="font-semibold">
                          {toEther(campaign.pledgeAmount)} MNT
                        </div>
                        <div className="text-sm text-muted-foreground">
                          pledged
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Created Projects */}
        {createdCampaigns.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>My Created Projects</CardTitle>
              <CardDescription>Campaigns you have created</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {createdCampaigns.map((campaign) => {
                  const formatted = formatCampaignForDisplay(campaign);
                  // All campaigns use unified /campaign/:id route
                  const campaignUrl = `/campaign/${campaign.id}`;
                  return (
                    <div
                      key={campaign.id}
                      className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      {/* Icon */}
                      <div className={`h-12 w-12 rounded-lg flex items-center justify-center text-2xl ${
                        campaign.hasMilestones ? 'bg-green-100 dark:bg-green-900/30' : 'bg-green-100'
                      }`}>
                        {campaign.hasMilestones ? '🎯' : '🚀'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={campaignUrl}
                            className="font-medium hover:text-primary truncate"
                          >
                            {campaign.name}
                          </Link>
                          <Badge variant="outline">
                            {campaign.tokenSymbol}
                          </Badge>
                          {campaign.hasMilestones && (
                            <Badge className="bg-green-600">Milestone</Badge>
                          )}
                          {formatted.isEnded && formatted.isSuccessful && (
                            <Badge className="bg-green-500">Success</Badge>
                          )}
                          {formatted.isEnded && !formatted.isSuccessful && (
                            <Badge variant="destructive">Failed</Badge>
                          )}
                          {!formatted.isEnded && (
                            <Badge variant="secondary">Active</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {formatted.progress}% funded · Goal: {toEther(campaign.goal)} MNT
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="text-right">
                        <div className="font-semibold text-green-600">
                          {toEther(campaign.pledged)} MNT
                        </div>
                        <div className="text-sm text-muted-foreground">
                          raised
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
