'use client';

/**
 * useMilestones Hooks - Presentation Layer
 * Hooks for milestone-based fund release operations via MilestoneEscrow contract
 */

import { useState, useCallback, useEffect } from 'react';
import { useActiveAccount, useSendTransaction } from 'thirdweb/react';
import { toEther } from 'thirdweb/utils';
import {
  getMilestoneCampaign,
  getCampaignMilestones,
  getMilestone,
  getMilestonePledge,
  isMilestoneCampaignSuccessful,
  getMilestoneProgress,
  canRequestEmergencyRefund,
  prepareSubmitMilestoneForApproval,
  prepareReleaseMilestoneFunds,
  prepareEmergencyRefund,
  prepareMilestoneClaimTokens,
  getProposalV2,
  getVotingResultsV2,
  prepareVoteV2,
  prepareExecuteProposalV2,
} from '@/lib/contracts/milestones';
import {
  MilestoneData,
  MilestoneCampaignData,
  MilestoneStatus,
  ProposalV2Data,
  getMilestoneStatusLabel,
  calculateMilestoneAmount,
  bpsToPercentage,
  formatMilestoneDeadline,
  getMilestoneDaysRemaining,
} from '@/lib/contracts/types';

// ============================================
// Types
// ============================================

interface MilestonesState {
  isLoading: boolean;
  campaign: MilestoneCampaignData | null;
  milestones: MilestoneData[];
  progress: {
    total: number;
    released: number;
    releasedAmount: bigint;
    unreleasedAmount: bigint;
    nextPendingIndex: number;
  };
  error: string | null;
}

interface SubmitMilestoneState {
  isSubmitting: boolean;
  error: string | null;
}

interface ReleaseFundsState {
  isReleasing: boolean;
  error: string | null;
}

interface EmergencyRefundState {
  isChecking: boolean;
  isRefunding: boolean;
  canRefund: boolean;
  pledgeAmount: bigint;
  error: string | null;
}

interface MilestoneVotingState {
  isLoading: boolean;
  isVoting: boolean;
  proposal: ProposalV2Data | null;
  votingResults: {
    forPercent: bigint;
    againstPercent: bigint;
    totalVotes: bigint;
  };
  hasVoted: boolean;
  error: string | null;
}

// ============================================
// Main Hook: useMilestones
// ============================================

/**
 * Main hook to fetch and manage milestones for a campaign
 */
export function useMilestones(campaignId: number) {
  const [state, setState] = useState<MilestonesState>({
    isLoading: true,
    campaign: null,
    milestones: [],
    progress: {
      total: 0,
      released: 0,
      releasedAmount: BigInt(0),
      unreleasedAmount: BigInt(0),
      nextPendingIndex: -1,
    },
    error: null,
  });

  const fetchMilestones = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const [campaign, milestones, progress] = await Promise.all([
        getMilestoneCampaign(campaignId),
        getCampaignMilestones(campaignId),
        getMilestoneProgress(campaignId),
      ]);

      if (!campaign) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Campaign not found or does not have milestones',
        }));
        return;
      }

      setState({
        isLoading: false,
        campaign,
        milestones,
        progress,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch milestones',
      }));
    }
  }, [campaignId]);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  // Helper functions
  const getMilestoneAmount = useCallback(
    (milestone: MilestoneData) => {
      if (!state.campaign) return BigInt(0);
      return calculateMilestoneAmount(state.campaign.pledged, milestone.percentage);
    },
    [state.campaign]
  );

  const getMilestonePercentage = useCallback(
    (milestone: MilestoneData) => bpsToPercentage(milestone.percentage),
    []
  );

  const getStatusLabel = useCallback(
    (status: MilestoneStatus) => getMilestoneStatusLabel(status),
    []
  );

  const formatDeadline = useCallback(
    (deadline: bigint) => formatMilestoneDeadline(deadline),
    []
  );

  const getDaysRemaining = useCallback(
    (deadline: bigint) => getMilestoneDaysRemaining(deadline),
    []
  );

  return {
    ...state,
    refetch: fetchMilestones,
    getMilestoneAmount,
    getMilestonePercentage,
    getStatusLabel,
    formatDeadline,
    getDaysRemaining,
    formatAmount: (amount: bigint) => toEther(amount),
  };
}

// ============================================
// Hook: useSubmitMilestone
// ============================================

/**
 * Hook for campaign creators to submit milestones for approval
 */
export function useSubmitMilestone(campaignId: number) {
  const account = useActiveAccount();
  const { mutateAsync: sendTransaction } = useSendTransaction();
  const [state, setState] = useState<SubmitMilestoneState>({
    isSubmitting: false,
    error: null,
  });

  const submitMilestone = useCallback(
    async (milestoneIndex: number) => {
      if (!account?.address) {
        setState({ isSubmitting: false, error: 'Please connect your wallet' });
        return false;
      }

      setState({ isSubmitting: true, error: null });

      try {
        const tx = prepareSubmitMilestoneForApproval(campaignId, milestoneIndex);
        await sendTransaction(tx);

        setState({ isSubmitting: false, error: null });
        return true;
      } catch (error) {
        setState({
          isSubmitting: false,
          error: error instanceof Error ? error.message : 'Failed to submit milestone',
        });
        return false;
      }
    },
    [account?.address, campaignId, sendTransaction]
  );

  return {
    ...state,
    submitMilestone,
  };
}

// ============================================
// Hook: useReleaseMilestoneFunds
// ============================================

/**
 * Hook for releasing milestone funds after approval
 */
export function useReleaseMilestoneFunds(campaignId: number) {
  const account = useActiveAccount();
  const { mutateAsync: sendTransaction } = useSendTransaction();
  const [state, setState] = useState<ReleaseFundsState>({
    isReleasing: false,
    error: null,
  });

  const releaseFunds = useCallback(
    async (milestoneIndex: number) => {
      if (!account?.address) {
        setState({ isReleasing: false, error: 'Please connect your wallet' });
        return false;
      }

      setState({ isReleasing: true, error: null });

      try {
        const tx = prepareReleaseMilestoneFunds(campaignId, milestoneIndex);
        await sendTransaction(tx);

        setState({ isReleasing: false, error: null });
        return true;
      } catch (error) {
        setState({
          isReleasing: false,
          error: error instanceof Error ? error.message : 'Failed to release funds',
        });
        return false;
      }
    },
    [account?.address, campaignId, sendTransaction]
  );

  const getReleaseSummary = useCallback(
    async (milestoneIndex: number) => {
      const milestone = await getMilestone(campaignId, milestoneIndex);
      const campaign = await getMilestoneCampaign(campaignId);

      if (!milestone || !campaign) return null;

      const amount = calculateMilestoneAmount(campaign.pledged, milestone.percentage);
      const platformFee = (amount * BigInt(200)) / BigInt(10000); // 2%
      const netAmount = amount - platformFee;

      return {
        totalAmount: toEther(amount),
        platformFee: toEther(platformFee),
        platformFeePercent: '2%',
        netAmount: toEther(netAmount),
      };
    },
    [campaignId]
  );

  return {
    ...state,
    releaseFunds,
    getReleaseSummary,
  };
}

// ============================================
// Hook: useEmergencyRefund
// ============================================

/**
 * Hook for investors to request emergency refund after milestone rejection
 */
export function useEmergencyRefund(campaignId: number) {
  const account = useActiveAccount();
  const { mutateAsync: sendTransaction } = useSendTransaction();
  const [state, setState] = useState<EmergencyRefundState>({
    isChecking: false,
    isRefunding: false,
    canRefund: false,
    pledgeAmount: BigInt(0),
    error: null,
  });

  const checkEligibility = useCallback(async () => {
    if (!account?.address) {
      setState((prev) => ({ ...prev, error: 'Please connect your wallet' }));
      return;
    }

    setState((prev) => ({ ...prev, isChecking: true, error: null }));

    try {
      const [canRefund, pledgeAmount] = await Promise.all([
        canRequestEmergencyRefund(campaignId),
        getMilestonePledge(campaignId, account.address),
      ]);

      const hasPledge = pledgeAmount > BigInt(0);

      setState({
        isChecking: false,
        isRefunding: false,
        canRefund: canRefund && hasPledge,
        pledgeAmount,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isChecking: false,
        error: error instanceof Error ? error.message : 'Failed to check eligibility',
      }));
    }
  }, [account?.address, campaignId]);

  const requestRefund = useCallback(async () => {
    if (!state.canRefund) return false;

    setState((prev) => ({ ...prev, isRefunding: true, error: null }));

    try {
      const tx = prepareEmergencyRefund(campaignId);
      await sendTransaction(tx);

      setState((prev) => ({
        ...prev,
        isRefunding: false,
        canRefund: false,
        pledgeAmount: BigInt(0),
      }));

      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isRefunding: false,
        error: error instanceof Error ? error.message : 'Emergency refund failed',
      }));
      return false;
    }
  }, [campaignId, sendTransaction, state.canRefund]);

  return {
    ...state,
    checkEligibility,
    requestRefund,
    formatAmount: (amount: bigint) => toEther(amount),
  };
}

// ============================================
// Hook: useMilestoneVoting
// ============================================

/**
 * Hook for voting on milestone approval proposals
 */
export function useMilestoneVoting(proposalId: number) {
  const account = useActiveAccount();
  const { mutateAsync: sendTransaction } = useSendTransaction();
  const [state, setState] = useState<MilestoneVotingState>({
    isLoading: true,
    isVoting: false,
    proposal: null,
    votingResults: {
      forPercent: BigInt(0),
      againstPercent: BigInt(0),
      totalVotes: BigInt(0),
    },
    hasVoted: false,
    error: null,
  });

  const fetchProposal = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const [proposal, votingResults] = await Promise.all([
        getProposalV2(proposalId),
        getVotingResultsV2(proposalId),
      ]);

      if (!proposal) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Proposal not found',
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        proposal,
        votingResults,
        error: null,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch proposal',
      }));
    }
  }, [proposalId]);

  useEffect(() => {
    if (proposalId > 0) {
      fetchProposal();
    }
  }, [fetchProposal, proposalId]);

  const vote = useCallback(
    async (support: boolean) => {
      if (!account?.address) {
        setState((prev) => ({ ...prev, error: 'Please connect your wallet' }));
        return false;
      }

      setState((prev) => ({ ...prev, isVoting: true, error: null }));

      try {
        const tx = prepareVoteV2(proposalId, support);
        await sendTransaction(tx);

        setState((prev) => ({
          ...prev,
          isVoting: false,
          hasVoted: true,
          error: null,
        }));

        // Refresh voting results
        await fetchProposal();
        return true;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isVoting: false,
          error: error instanceof Error ? error.message : 'Vote failed',
        }));
        return false;
      }
    },
    [account?.address, fetchProposal, proposalId, sendTransaction]
  );

  const executeProposal = useCallback(async () => {
    if (!account?.address) {
      setState((prev) => ({ ...prev, error: 'Please connect your wallet' }));
      return false;
    }

    setState((prev) => ({ ...prev, isVoting: true, error: null }));

    try {
      const tx = prepareExecuteProposalV2(proposalId);
      await sendTransaction(tx);

      setState((prev) => ({ ...prev, isVoting: false, error: null }));
      await fetchProposal();
      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isVoting: false,
        error: error instanceof Error ? error.message : 'Execute proposal failed',
      }));
      return false;
    }
  }, [account?.address, fetchProposal, proposalId, sendTransaction]);

  return {
    ...state,
    refetch: fetchProposal,
    vote,
    executeProposal,
  };
}

// ============================================
// Hook: useMilestoneClaimTokens
// ============================================

/**
 * Hook to claim equity tokens from milestone-based campaign
 */
export function useMilestoneClaimTokens(campaignId: number) {
  const account = useActiveAccount();
  const { mutateAsync: sendTransaction } = useSendTransaction();
  const [state, setState] = useState({
    isChecking: false,
    isClaiming: false,
    canClaim: false,
    pledgeAmount: BigInt(0),
    error: null as string | null,
  });

  const checkEligibility = useCallback(async () => {
    if (!account?.address) {
      setState((prev) => ({ ...prev, error: 'Please connect your wallet' }));
      return;
    }

    setState((prev) => ({ ...prev, isChecking: true, error: null }));

    try {
      const [campaign, pledgeAmount, isSuccessful] = await Promise.all([
        getMilestoneCampaign(campaignId),
        getMilestonePledge(campaignId, account.address),
        isMilestoneCampaignSuccessful(campaignId),
      ]);

      if (!campaign) {
        setState((prev) => ({
          ...prev,
          isChecking: false,
          error: 'Campaign not found',
        }));
        return;
      }

      const now = Date.now() / 1000;
      const isEnded = now >= Number(campaign.endAt);
      const hasPledge = pledgeAmount > BigInt(0);

      // Can claim if: campaign ended, goal reached, user has pledge
      const canClaim = isEnded && isSuccessful && hasPledge;

      setState({
        isChecking: false,
        isClaiming: false,
        canClaim,
        pledgeAmount,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isChecking: false,
        error: error instanceof Error ? error.message : 'Failed to check eligibility',
      }));
    }
  }, [account?.address, campaignId]);

  const claimTokens = useCallback(async () => {
    if (!state.canClaim) return false;

    setState((prev) => ({ ...prev, isClaiming: true, error: null }));

    try {
      const tx = prepareMilestoneClaimTokens(campaignId);
      await sendTransaction(tx);

      setState((prev) => ({
        ...prev,
        isClaiming: false,
        canClaim: false,
      }));

      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isClaiming: false,
        error: error instanceof Error ? error.message : 'Token claim failed',
      }));
      return false;
    }
  }, [campaignId, sendTransaction, state.canClaim]);

  return {
    ...state,
    checkEligibility,
    claimTokens,
    formatAmount: (amount: bigint) => toEther(amount),
  };
}
