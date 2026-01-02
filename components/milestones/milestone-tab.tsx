"use client";

import { useEffect, useCallback } from "react";
import { useActiveAccount } from "thirdweb/react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { MilestoneCard } from "./milestone-card";
import { MilestoneProgressCard } from "./milestone-progress-card";
import {
  useMilestones,
  useSubmitMilestone,
  useReleaseMilestoneFunds,
  useEmergencyRefund,
} from "@/src/presentation/hooks/useMilestones";
import { MilestoneStatus } from "@/lib/contracts/types";
import { toast } from "sonner";

interface MilestoneTabProps {
  campaignId: number;
  creatorAddress: string;
}

export function MilestoneTab({ campaignId, creatorAddress }: MilestoneTabProps) {
  const account = useActiveAccount();
  const isCreator =
    account?.address?.toLowerCase() === creatorAddress?.toLowerCase();

  // Hooks
  const {
    isLoading,
    campaign,
    milestones,
    progress,
    error,
    refetch,
    getMilestoneAmount,
    getMilestonePercentage,
    formatDeadline,
    getDaysRemaining,
    formatAmount,
  } = useMilestones(campaignId);

  const { isSubmitting, submitMilestone, error: submitError } =
    useSubmitMilestone(campaignId);

  const {
    isReleasing,
    releaseFunds,
    error: releaseError,
  } = useReleaseMilestoneFunds(campaignId);

  const {
    isRefunding,
    canRefund,
    pledgeAmount,
    checkEligibility: checkRefundEligibility,
    requestRefund,
    formatAmount: formatRefundAmount,
    error: refundError,
  } = useEmergencyRefund(campaignId);

  // Check refund eligibility when milestones load
  useEffect(() => {
    if (milestones.length > 0 && account?.address) {
      const hasRejected = milestones.some(
        (m) => m.status === MilestoneStatus.Rejected
      );
      if (hasRejected) {
        checkRefundEligibility();
      }
    }
  }, [milestones, account?.address, checkRefundEligibility]);

  // Handlers
  const handleSubmit = useCallback(
    async (index: number) => {
      const success = await submitMilestone(index);
      if (success) {
        toast.success("Milestone submitted for approval!");
        refetch();
      } else if (submitError) {
        toast.error(submitError);
      }
    },
    [submitMilestone, submitError, refetch]
  );

  const handleRelease = useCallback(
    async (index: number) => {
      const success = await releaseFunds(index);
      if (success) {
        toast.success("Funds released successfully!");
        refetch();
      } else if (releaseError) {
        toast.error(releaseError);
      }
    },
    [releaseFunds, releaseError, refetch]
  );

  const handleEmergencyRefund = useCallback(async () => {
    const success = await requestRefund();
    if (success) {
      toast.success("Emergency refund processed successfully!");
      refetch();
    } else if (refundError) {
      toast.error(refundError);
    }
  }, [requestRefund, refundError, refetch]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // No milestones state
  if (!campaign || milestones.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          This campaign does not use milestone-based fund release.
        </AlertDescription>
      </Alert>
    );
  }

  // Calculate totals for progress card
  const releasedPercent = campaign.pledged > BigInt(0)
    ? Number((progress.releasedAmount * BigInt(100)) / campaign.pledged)
    : 0;

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <MilestoneProgressCard
        milestones={milestones.map((m) => ({
          title: m.title,
          status: m.status,
          percentage: getMilestonePercentage(m),
        }))}
        releasedAmount={formatAmount(progress.releasedAmount)}
        totalAmount={formatAmount(campaign.pledged)}
        releasedPercent={releasedPercent}
      />

      {/* Emergency Refund Alert */}
      {canRefund && (
        <Alert className="border-red-200 bg-red-50 dark:bg-red-950">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <p className="font-medium text-red-700 dark:text-red-300">
                Emergency Refund Available
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">
                A milestone was rejected. You can claim your refund of{" "}
                {formatRefundAmount(pledgeAmount)} MNT.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleEmergencyRefund}
              disabled={isRefunding}
            >
              {isRefunding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Claim Refund"
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Milestone Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Milestones ({milestones.length})</h3>
          <Button variant="ghost" size="sm" onClick={refetch}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {milestones.map((milestone, index) => {
          const canSubmit =
            isCreator &&
            milestone.status === MilestoneStatus.Pending &&
            (index === 0 ||
              milestones[index - 1].status === MilestoneStatus.Released);

          const canRelease =
            isCreator && milestone.status === MilestoneStatus.Approved;

          return (
            <MilestoneCard
              key={index}
              index={index}
              title={milestone.title}
              description={milestone.description}
              percentage={getMilestonePercentage(milestone)}
              amount={formatAmount(getMilestoneAmount(milestone))}
              deadline={formatDeadline(milestone.deadline)}
              daysRemaining={getDaysRemaining(milestone.deadline)}
              status={milestone.status}
              proposalId={
                milestone.proposalId > BigInt(0)
                  ? Number(milestone.proposalId)
                  : undefined
              }
              isCreator={isCreator}
              canSubmit={canSubmit}
              canRelease={canRelease}
              isSubmitting={isSubmitting}
              isReleasing={isReleasing}
              onSubmit={() => handleSubmit(index)}
              onRelease={() => handleRelease(index)}
              onViewProposal={
                milestone.proposalId > BigInt(0)
                  ? () => {
                      // Scroll to governance tab or open modal
                      const governanceTab = document.querySelector(
                        '[data-value="governance"]'
                      );
                      if (governanceTab) {
                        (governanceTab as HTMLElement).click();
                      }
                    }
                  : undefined
              }
            />
          );
        })}
      </div>

      {/* Info for non-creators */}
      {!isCreator && !canRefund && (
        <Alert>
          <AlertDescription>
            As an investor, you can vote on milestone approvals in the Governance
            tab. Your voting power is proportional to your investment.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
