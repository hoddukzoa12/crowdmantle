'use client';

/**
 * Unified Campaign Detail Page
 * Displays on-chain campaign data from the unified MilestoneEscrow contract
 * Handles both regular campaigns and milestone-based campaigns
 */

import { useState, useEffect } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefundWithdrawCard } from '@/components/crowdfunding/refund-withdraw-card';
import { ContributeForm } from '@/components/project/contribute-form';
import { ConnectButtonWrapper } from '@/components/wallet/connect-button-wrapper';
import { GovernanceTab } from '@/components/governance/governance-tab';
import { MilestoneTab } from '@/components/milestones/milestone-tab';
import {
  getCampaign,
  getPledge,
  formatCampaignForDisplay,
  type CampaignData,
} from '@/lib/contracts/escrow';
import { CONTRACTS } from '@/lib/constants/addresses';
import { toEther } from 'thirdweb/utils';
import {
  ArrowLeft,
  Calendar,
  Target,
  Wallet,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  Vote,
  Info,
} from 'lucide-react';

export default function CampaignDetailPage() {
  const params = useParams();
  const account = useActiveAccount();
  const campaignId = Number(params.id);

  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [userPledge, setUserPledge] = useState<bigint>(BigInt(0));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch campaign data
  useEffect(() => {
    const fetchCampaign = async () => {
      if (isNaN(campaignId) || campaignId < 0) {
        setError('Invalid campaign ID');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const data = await getCampaign(campaignId);
        if (!data) {
          setError('Campaign not found');
        } else {
          setCampaign(data);
        }
      } catch (err) {
        console.error('Failed to fetch campaign:', err);
        setError('Failed to load campaign');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCampaign();
  }, [campaignId]);

  // Fetch user's pledge amount
  useEffect(() => {
    const fetchPledge = async () => {
      if (!account?.address || !campaign) return;

      try {
        const pledge = await getPledge(campaignId, account.address);
        setUserPledge(pledge);
      } catch (err) {
        console.error('Failed to fetch pledge:', err);
      }
    };

    fetchPledge();
  }, [account?.address, campaign, campaignId]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/20">
        <div className="border-b bg-background">
          <div className="container mx-auto px-4 py-3">
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-48 w-full" />
            </div>
            <div className="lg:col-span-1">
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold mb-2">Campaign Not Found</h1>
          <p className="text-muted-foreground mb-4">{error || 'This campaign does not exist.'}</p>
          <Button asChild>
            <Link href="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const formatted = formatCampaignForDisplay(campaign);
  const isCreator = account?.address?.toLowerCase() === campaign.creator.toLowerCase();

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Breadcrumb */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            <span>/</span>
            <Link href="/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-foreground">{campaign.name}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Campaign Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Badge variant="outline" className="text-sm">
              Campaign #{campaignId}
            </Badge>
            <Badge variant="outline">{campaign.tokenSymbol}</Badge>
            {campaign.hasMilestones && (
              <Badge className="bg-green-600">Milestone-based</Badge>
            )}
            {formatted.isEnded ? (
              formatted.isSuccessful ? (
                <Badge className="bg-green-500">Funded</Badge>
              ) : (
                <Badge variant="destructive">Failed</Badge>
              )
            ) : (
              <Badge variant="secondary">Active</Badge>
            )}
            {isCreator && (
              <Badge variant="outline" className="border-blue-500 text-blue-500">
                Your Campaign
              </Badge>
            )}
          </div>
          <h1 className="text-3xl font-bold mb-2">{campaign.name}</h1>
          <p className="text-muted-foreground">
            Created by {campaign.creator.slice(0, 6)}...{campaign.creator.slice(-4)}
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <Info className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="milestones" className="gap-2">
              <Target className="h-4 w-4" />
              Milestones
            </TabsTrigger>
            <TabsTrigger value="governance" className="gap-2">
              <Vote className="h-4 w-4" />
              Governance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Funding Progress Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Funding Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Raised</span>
                    <span className="font-semibold">
                      {toEther(campaign.pledged)} / {toEther(campaign.goal)} MNT
                    </span>
                  </div>
                  <Progress value={formatted.progress} className="h-3" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{formatted.progress}% funded</span>
                    <span className="text-muted-foreground">
                      {formatted.isEnded ? 'Ended' : `${formatted.daysRemaining} days left`}
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      Start Date
                    </div>
                    <p className="font-medium">
                      {formatted.startAt.toLocaleString('en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      End Date
                    </div>
                    <p className="font-medium">
                      {formatted.endAt.toLocaleString('en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Campaign Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>Campaign Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Status indicator */}
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                    {formatted.isEnded ? (
                      formatted.isSuccessful ? (
                        <>
                          <CheckCircle className="w-8 h-8 text-green-500" />
                          <div>
                            <p className="font-semibold text-green-700">Funding Successful!</p>
                            <p className="text-sm text-muted-foreground">
                              Goal of {toEther(campaign.goal)} MNT was reached.
                              {campaign.claimed
                                ? ' Funds have been withdrawn.'
                                : ' Funds are ready for withdrawal.'}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-8 h-8 text-red-500" />
                          <div>
                            <p className="font-semibold text-red-700">Funding Failed</p>
                            <p className="text-sm text-muted-foreground">
                              Goal was not reached. Investors can claim refunds.
                            </p>
                          </div>
                        </>
                      )
                    ) : (
                      <>
                        <Clock className="w-8 h-8 text-blue-500" />
                        <div>
                          <p className="font-semibold text-blue-700">Funding In Progress</p>
                          <p className="text-sm text-muted-foreground">
                            {formatted.daysRemaining} days remaining to reach the goal.
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* User's investment */}
                  {account && userPledge > BigInt(0) && (
                    <div className="p-4 rounded-lg border bg-background">
                      <div className="flex items-center gap-2 mb-2">
                        <Wallet className="w-4 h-4 text-primary" />
                        <span className="font-medium">Your Investment</span>
                      </div>
                      <p className="text-2xl font-bold text-primary">
                        {toEther(userPledge)} MNT
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        = {toEther(userPledge)} {campaign.tokenSymbol} tokens (after success)
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Token Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Equity Token Info</CardTitle>
                <CardDescription>
                  Token issued upon successful funding
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Token Symbol</p>
                    <p className="font-semibold">{campaign.tokenSymbol}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Token Contract</p>
                    <a
                      href={`https://sepolia.mantlescan.xyz/address/${campaign.equityToken}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      {campaign.equityToken.slice(0, 6)}...{campaign.equityToken.slice(-4)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Exchange Rate</p>
                    <p className="font-semibold">1 MNT = 1 {campaign.tokenSymbol}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Issuance</p>
                    <p className="font-semibold">After successful funding</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-4">
              {/* Contribute Form - only show if campaign is active */}
              {!formatted.isEnded && (
                <ContributeForm
                  project={{
                    id: `campaign-${campaignId}`,
                    name: campaign.name,
                    description: '',
                    longDescription: '',
                    category: 'tech',
                    status: 'active',
                    goal: Number(toEther(campaign.goal)),
                    fundRaised: Number(toEther(campaign.pledged)),
                    deadline: Math.floor(formatted.endAt.getTime() / 1000),
                    expectedReturn: 0,
                    image: '',
                    contractAddress: campaign.equityToken,
                    walletAddress: campaign.creator,
                    investorCount: 0,
                    minInvestment: 10,
                    tokenSymbol: campaign.tokenSymbol,
                    companyInfo: {
                      foundedYear: new Date().getFullYear(),
                      employees: 1,
                      location: 'Blockchain',
                    },
                  }}
                  campaignId={campaignId}
                />
              )}

              {/* Refund/Withdraw/Claim Card */}
              <RefundWithdrawCard campaignId={campaignId} isFounder={isCreator} />

              {/* Contract Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Contract Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Network</span>
                    <span>Mantle Sepolia</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Campaign ID</span>
                    <span>#{campaignId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Escrow Contract</span>
                    <a
                      href={`https://sepolia.mantlescan.xyz/address/${CONTRACTS.MILESTONE_ESCROW}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      {CONTRACTS.MILESTONE_ESCROW.slice(0, 6)}...
                      {CONTRACTS.MILESTONE_ESCROW.slice(-4)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </CardContent>
              </Card>

              {/* Connect Wallet CTA */}
              {!account && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center space-y-3">
                      <Wallet className="w-8 h-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Connect your wallet to invest
                      </p>
                      <ConnectButtonWrapper />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
          </TabsContent>

          <TabsContent value="milestones">
            <MilestoneTab
              campaignId={campaignId}
              creatorAddress={campaign.creator}
            />
          </TabsContent>

          <TabsContent value="governance">
            <GovernanceTab
              campaignId={campaignId}
              campaign={campaign}
              equityTokenAddress={campaign.equityToken}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
