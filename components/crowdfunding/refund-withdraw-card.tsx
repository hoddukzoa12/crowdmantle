'use client';

/**
 * RefundWithdrawCard Component
 * Shows refund, withdrawal, or token claim options based on campaign status
 */

import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CheckCircle, Clock, RefreshCw, Wallet, Coins } from 'lucide-react';
import { useRefund, useWithdraw, useClaimTokens } from '@/src/presentation/hooks';
import { toEther } from 'thirdweb/utils';
import { toast } from 'sonner';

interface RefundWithdrawCardProps {
  campaignId: number;
  isFounder?: boolean;
}

export function RefundWithdrawCard({ campaignId, isFounder = false }: RefundWithdrawCardProps) {
  // Show different cards based on role
  if (isFounder) {
    return <FounderWithdrawSection campaignId={campaignId} />;
  }

  return <InvestorSection campaignId={campaignId} />;
}

function InvestorSection({ campaignId }: { campaignId: number }) {
  const refund = useRefund(campaignId);
  const claim = useClaimTokens(campaignId);

  useEffect(() => {
    refund.checkEligibility();
    claim.checkEligibility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLoading = refund.isChecking || claim.isChecking;

  // Show loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // No campaign data
  if (!refund.campaign && !claim.campaign) {
    return null;
  }

  const campaign = refund.campaign || claim.campaign;
  if (!campaign) return null;

  const now = Date.now() / 1000;
  const isEnded = now >= Number(campaign.endAt);
  const isSuccessful = campaign.pledged >= campaign.goal;
  const daysRemaining = isEnded ? 0 : Math.ceil((Number(campaign.endAt) - now) / 86400);

  // Active campaign - show remaining time
  if (!isEnded) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-base">Funding In Progress</CardTitle>
          </div>
          <CardDescription>
            {daysRemaining} days remaining until deadline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current Raised</span>
              <span className="font-medium">{toEther(campaign.pledged)} MNT</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Goal</span>
              <span className="font-medium">{toEther(campaign.goal)} MNT</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min(100, Number((campaign.pledged * BigInt(100)) / campaign.goal))}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Goal reached - show token claim option
  if (isSuccessful) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <CardTitle className="text-base">Funding Successful!</CardTitle>
            <Badge className="bg-green-500">Goal Reached</Badge>
          </div>
          <CardDescription>
            Claim your equity tokens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {claim.hasClaimed ? (
            <div className="text-sm text-green-700 dark:text-green-300">
              You have already claimed your {campaign.tokenSymbol} tokens!
            </div>
          ) : claim.canClaim ? (
            <>
              <div className="rounded-lg bg-white p-4 border">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Your Pledge</span>
                  <span className="text-xl font-bold text-green-600">
                    {toEther(claim.pledgeAmount)} MNT
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  = {toEther(claim.pledgeAmount)} {campaign.tokenSymbol} tokens
                </div>
              </div>
              <Button
                className="w-full"
                onClick={async () => {
                  const success = await claim.claimTokens();
                  if (success) {
                    toast.success('Tokens claimed successfully!');
                  } else {
                    toast.error(claim.error || 'Failed to claim tokens');
                  }
                }}
                disabled={claim.isClaiming}
              >
                {claim.isClaiming ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Claiming...
                  </span>
                ) : (
                  <>
                    <Coins className="w-4 h-4 mr-2" />
                    Claim {campaign.tokenSymbol} Tokens
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">
              {refund.pledgeAmount > BigInt(0)
                ? 'Tokens will be available for claim after the campaign ends.'
                : 'No pledged investment found.'}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Goal not reached - show refund option
  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          <CardTitle className="text-base">Refund Available</CardTitle>
          <Badge variant="outline" className="text-orange-600 border-orange-300">
            Goal Not Met
          </Badge>
        </div>
        <CardDescription>Refund available as funding goal was not reached</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {refund.canRefund && refund.pledgeAmount > BigInt(0) ? (
          <>
            <div className="rounded-lg bg-white p-4 border">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Refundable Amount</span>
                <span className="text-xl font-bold text-orange-600">
                  {toEther(refund.pledgeAmount)} MNT
                </span>
              </div>
            </div>
            <Button
              className="w-full"
              variant="outline"
              onClick={async () => {
                const success = await refund.requestRefund();
                if (success) {
                  toast.success('Refund processed successfully!');
                } else {
                  toast.error(refund.error || 'Failed to process refund');
                }
              }}
              disabled={refund.isRefunding}
            >
              {refund.isRefunding ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Processing...
                </span>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Request Refund
                </>
              )}
            </Button>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">
            {refund.error || 'No refundable investments found.'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FounderWithdrawSection({ campaignId }: { campaignId: number }) {
  const withdraw = useWithdraw(campaignId);

  useEffect(() => {
    withdraw.checkEligibility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (withdraw.isChecking) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!withdraw.campaign) {
    return null;
  }

  const campaign = withdraw.campaign;
  const now = Date.now() / 1000;
  const isEnded = now >= Number(campaign.endAt);
  const isSuccessful = campaign.pledged >= campaign.goal;
  const daysRemaining = isEnded ? 0 : Math.ceil((Number(campaign.endAt) - now) / 86400);

  // Active campaign - show remaining time
  if (!isEnded) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-base">Funding In Progress</CardTitle>
          </div>
          <CardDescription>
            {daysRemaining} days remaining until deadline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Funds can be withdrawn after funding is complete and goal is reached.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Goal not reached - cannot withdraw
  if (!isSuccessful) {
    return (
      <Card className="border-red-200 bg-red-50/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <CardTitle className="text-base">Goal Not Met</CardTitle>
          </div>
          <CardDescription>
            Refunds are being processed to investors as the goal was not reached
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount Raised</span>
              <span>{toEther(campaign.pledged)} MNT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Goal</span>
              <span>{toEther(campaign.goal)} MNT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Achievement</span>
              <span className="text-red-600">
                {Number((campaign.pledged * BigInt(100)) / campaign.goal)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const summary = withdraw.getWithdrawalSummary();

  // Goal reached - show withdrawal option
  return (
    <Card className="border-green-200 bg-green-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-green-500" />
          <CardTitle className="text-base">Withdrawal Available</CardTitle>
          <Badge variant="outline" className="text-green-600 border-green-300">
            Funding Successful
          </Badge>
        </div>
        <CardDescription>Goal reached - funds are ready for withdrawal</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {campaign.claimed ? (
          <div className="text-sm text-green-700 dark:text-green-300">
            Funds have already been withdrawn!
          </div>
        ) : withdraw.canWithdraw && summary ? (
          <>
            <div className="rounded-lg bg-white p-4 border space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Raised</span>
                <span className="font-medium">{summary.totalAmount} MNT</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Platform Fee ({summary.platformFeePercent})
                </span>
                <span className="text-red-500">-{summary.platformFee} MNT</span>
              </div>
              <hr />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Net Amount</span>
                <span className="text-xl font-bold text-green-600">
                  {summary.netAmount} MNT
                </span>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={async () => {
                const success = await withdraw.requestWithdrawal();
                if (success) {
                  toast.success('Funds withdrawn successfully!');
                } else {
                  toast.error(withdraw.error || 'Failed to withdraw funds');
                }
              }}
              disabled={withdraw.isWithdrawing}
            >
              {withdraw.isWithdrawing ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Processing...
                </span>
              ) : (
                <>
                  <Wallet className="w-4 h-4 mr-2" />
                  Withdraw Funds
                </>
              )}
            </Button>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">
            {withdraw.error || 'Unable to verify withdrawal permission.'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
