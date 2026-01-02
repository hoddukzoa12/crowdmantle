'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { getAllCampaigns, formatCampaignForDisplay, type CampaignData } from '@/lib/contracts/escrow';
import { KR_CROWDFUNDING_RULES } from '@/lib/constants/regulations';
import { toEther } from 'thirdweb/utils';

type CampaignWithId = CampaignData & { id: number };

export default function Home() {
  const [campaigns, setCampaigns] = useState<CampaignWithId[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const data = await getAllCampaigns();
        setCampaigns(data);
      } catch (error) {
        console.error('Failed to fetch campaigns:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCampaigns();
  }, []);

  // Calculate stats
  const totalRaised = campaigns.reduce((sum, c) => sum + c.pledged, BigInt(0));
  const activeCampaigns = campaigns.filter((c) => !formatCampaignForDisplay(c).isEnded);
  const featuredCampaigns = activeCampaigns.slice(0, 3);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4">
              Securities Crowdfunding on Mantle Network
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              Invest in Startups,
              <br />
              Receive <span className="text-primary">Equity Tokens</span>
            </h1>
            <p className="mt-6 text-base text-muted-foreground md:text-lg">
              Transparent and secure startup investment powered by blockchain.
              <br className="hidden sm:block" />
              Only <span className="font-semibold text-primary">2% fee</span> (vs 5% traditional),{' '}
              <span className="font-semibold text-primary">100% refund</span> if goal not met
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg">
                <Link href="/projects">Invest Now</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/project/create">Create Campaign</Link>
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <span className="text-lg">🔒</span>
                <span>Smart Contract Security</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-lg">💎</span>
                <span>Transparent On-chain Records</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-lg">⚡</span>
                <span>Instant Token Issuance</span>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      </section>

      {/* Stats Section */}
      <section className="border-y bg-muted/30 py-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div className="text-center">
              {isLoading ? (
                <Skeleton className="h-8 w-24 mx-auto mb-1" />
              ) : (
                <div className="text-2xl font-bold text-primary md:text-3xl">
                  {Number(toEther(totalRaised)).toLocaleString()}
                </div>
              )}
              <div className="text-sm text-muted-foreground">MNT Raised</div>
            </div>
            <div className="text-center">
              {isLoading ? (
                <Skeleton className="h-8 w-16 mx-auto mb-1" />
              ) : (
                <div className="text-2xl font-bold text-primary md:text-3xl">
                  {campaigns.length}
                </div>
              )}
              <div className="text-sm text-muted-foreground">Total Campaigns</div>
            </div>
            <div className="text-center">
              {isLoading ? (
                <Skeleton className="h-8 w-16 mx-auto mb-1" />
              ) : (
                <div className="text-2xl font-bold text-primary md:text-3xl">
                  {activeCampaigns.length}
                </div>
              )}
              <div className="text-sm text-muted-foreground">Active Now</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary md:text-3xl">
                {KR_CROWDFUNDING_RULES.PLATFORM_FEE_PERCENTAGE}%
              </div>
              <div className="text-sm text-muted-foreground">Low Fee</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Campaigns */}
      <section className="py-12 md:py-16" id="projects">
        <div className="container mx-auto px-4">
          <div className="mb-8 text-center">
            <Badge variant="outline" className="mb-2">
              LIVE
            </Badge>
            <h2 className="text-2xl font-bold md:text-3xl">Active Campaigns</h2>
            <p className="mt-2 text-muted-foreground">
              Invest in promising startups now
            </p>
          </div>

          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-2 w-full mb-4" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : featuredCampaigns.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">🚀</div>
              <h3 className="text-lg font-semibold mb-2">No Active Campaigns</h3>
              <p className="text-muted-foreground mb-4">
                Be the first to create a crowdfunding campaign!
              </p>
              <Button asChild>
                <Link href="/project/create">Create Campaign</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
              {featuredCampaigns.map((campaign) => {
                const formatted = formatCampaignForDisplay(campaign);
                return (
                  <Card key={campaign.id} className="hover:border-primary/50 transition-all hover:shadow-lg">
                    <CardHeader>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">#{campaign.id}</Badge>
                        <Badge variant="secondary">{campaign.tokenSymbol}</Badge>
                        {formatted.daysRemaining <= 7 && (
                          <Badge variant="destructive">D-{formatted.daysRemaining}</Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg">
                        <Link href={`/campaign/${campaign.id}`} className="hover:text-primary">
                          {campaign.name}
                        </Link>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>{Number(toEther(campaign.pledged)).toLocaleString()} MNT</span>
                          <span className="text-muted-foreground">
                            / {Number(toEther(campaign.goal)).toLocaleString()} MNT
                          </span>
                        </div>
                        <Progress value={formatted.progress} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>{formatted.progress}% funded</span>
                          <span>{formatted.daysRemaining} days left</span>
                        </div>
                      </div>
                      <Button asChild className="w-full">
                        <Link href={`/campaign/${campaign.id}`}>Invest Now</Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {!isLoading && campaigns.length > 3 && (
            <div className="mt-8 text-center">
              <Button asChild variant="outline" size="lg">
                <Link href="/projects">View All Campaigns</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t bg-muted/20 py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold md:text-3xl">How It Works</h2>
            <p className="mt-2 text-muted-foreground">
              Invest in startups in just 3 simple steps
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                1
              </div>
              <h3 className="mt-4 text-lg font-semibold">Connect Wallet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Easily connect with Bitget, MetaMask, Coinbase, or email
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                2
              </div>
              <h3 className="mt-4 text-lg font-semibold">Choose Campaign</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Select a verified startup to invest in
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                3
              </div>
              <h3 className="mt-4 text-lg font-semibold">Invest & Receive Tokens</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Invest with MNT and receive equity tokens after success
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold md:text-3xl">Why CrowdMantle?</h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-background p-6">
              <div className="text-3xl mb-3">💰</div>
              <h3 className="font-semibold">Low Fees</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                5% → 2%
                <br />
                Reduced costs via blockchain
              </p>
            </div>

            <div className="rounded-lg border bg-background p-6">
              <div className="text-3xl mb-3">🔐</div>
              <h3 className="font-semibold">100% Refund Guarantee</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Full refund if goal not met
                <br />
                Automated via smart contract
              </p>
            </div>

            <div className="rounded-lg border bg-background p-6">
              <div className="text-3xl mb-3">🌐</div>
              <h3 className="font-semibold">Global Investment</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Borderless investment opportunities
                <br />
                Mantle ecosystem integration
              </p>
            </div>

            <div className="rounded-lg border bg-background p-6">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="font-semibold">Instant Tokenization</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Equity tokens issued on success
                <br />
                Trade anytime
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Regulation Notice */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl rounded-lg border border-orange-200 bg-orange-50 p-6 dark:border-orange-900 dark:bg-orange-950/30">
            <h3 className="flex items-center gap-2 font-semibold text-orange-800 dark:text-orange-200">
              <span>⚠️</span> Investor Notice
            </h3>
            <ul className="mt-3 space-y-1 text-sm text-orange-700 dark:text-orange-300">
              <li>
                • Annual investment limit: {KR_CROWDFUNDING_RULES.INDIVIDUAL_ANNUAL_LIMIT_USDC} MNT
                per individual
              </li>
              <li>• Risk of principal loss exists; expected returns are not guaranteed</li>
              <li>• Please review the investment prospectus before investing</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl rounded-2xl bg-primary p-8 text-center text-primary-foreground md:p-12">
            <h2 className="text-2xl font-bold md:text-3xl">Get Started Today</h2>
            <p className="mt-4 text-primary-foreground/80">
              Experience the new standard for startup investment on Mantle Network
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" variant="secondary">
                <Link href="/projects">Start Investing</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/20 hover:bg-white/10">
                <Link href="/dashboard">My Portfolio</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
