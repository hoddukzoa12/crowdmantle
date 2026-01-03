'use client';

/**
 * useRefundWithdraw Hooks - Presentation Layer
 * Hooks for refund and withdrawal operations via Escrow contract
 */

import { useState, useCallback } from 'react';
import { useActiveAccount, useSendTransaction } from 'thirdweb/react';
import { toEther } from 'thirdweb/utils';
import {
  getCampaign,
  getPledge,
  isCampaignSuccessful,
  hasClaimedTokens,
  prepareRefund,
  prepareClaim,
  prepareClaimTokens,
  prepareClaimFounderTokens,
  type CampaignData,
} from '@/lib/contracts/escrow';

interface RefundState {
  isChecking: boolean;
  isRefunding: boolean;
  canRefund: boolean;
  pledgeAmount: bigint;
  campaign: CampaignData | null;
  error: string | null;
}

interface WithdrawState {
  isChecking: boolean;
  isWithdrawing: boolean;
  canWithdraw: boolean;
  campaign: CampaignData | null;
  error: string | null;
}

interface ClaimTokensState {
  isChecking: boolean;
  isClaiming: boolean;
  canClaim: boolean;
  hasClaimed: boolean;
  pledgeAmount: bigint;
  campaign: CampaignData | null;
  error: string | null;
}

interface ClaimFounderTokensState {
  isChecking: boolean;
  isClaiming: boolean;
  canClaim: boolean;
  hasClaimed: boolean;
  founderShare: bigint;
  campaign: CampaignData | null;
  error: string | null;
}

/**
 * Hook to check and handle refund eligibility for a campaign
 */
export function useRefund(campaignId: number) {
  const account = useActiveAccount();
  const { mutateAsync: sendTransaction } = useSendTransaction();
  const [state, setState] = useState<RefundState>({
    isChecking: false,
    isRefunding: false,
    canRefund: false,
    pledgeAmount: BigInt(0),
    campaign: null,
    error: null,
  });

  const checkEligibility = useCallback(async () => {
    if (!account?.address) {
      setState((prev) => ({ ...prev, error: 'Please connect your wallet' }));
      return;
    }

    setState((prev) => ({ ...prev, isChecking: true, error: null }));

    try {
      const [campaign, pledgeAmount, isSuccessful] = await Promise.all([
        getCampaign(campaignId),
        getPledge(campaignId, account.address),
        isCampaignSuccessful(campaignId),
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

      // Can refund if: campaign ended, goal NOT reached, user has pledge
      const canRefund = isEnded && !isSuccessful && hasPledge;

      setState({
        isChecking: false,
        isRefunding: false,
        canRefund,
        pledgeAmount,
        campaign,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isChecking: false,
        error: error instanceof Error ? error.message : 'Failed to check refund eligibility',
      }));
    }
  }, [account?.address, campaignId]);

  const requestRefund = useCallback(async () => {
    if (!state.canRefund) return false;

    setState((prev) => ({ ...prev, isRefunding: true, error: null }));

    try {
      const tx = prepareRefund(campaignId);
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
        error: error instanceof Error ? error.message : 'Refund failed',
      }));
      return false;
    }
  }, [campaignId, sendTransaction, state.canRefund]);

  const formatRefundAmount = useCallback(
    (amount: bigint) => toEther(amount),
    []
  );

  return {
    ...state,
    checkEligibility,
    requestRefund,
    formatRefundAmount,
  };
}

/**
 * Hook to check and handle withdrawal eligibility for a campaign (founder)
 */
export function useWithdraw(campaignId: number) {
  const account = useActiveAccount();
  const { mutateAsync: sendTransaction } = useSendTransaction();
  const [state, setState] = useState<WithdrawState>({
    isChecking: false,
    isWithdrawing: false,
    canWithdraw: false,
    campaign: null,
    error: null,
  });

  const checkEligibility = useCallback(async () => {
    if (!account?.address) {
      setState((prev) => ({ ...prev, error: 'Please connect your wallet' }));
      return;
    }

    setState((prev) => ({ ...prev, isChecking: true, error: null }));

    try {
      const [campaign, isSuccessful] = await Promise.all([
        getCampaign(campaignId),
        isCampaignSuccessful(campaignId),
      ]);

      if (!campaign) {
        setState((prev) => ({
          ...prev,
          isChecking: false,
          error: 'Campaign not found',
        }));
        return;
      }

      const isCreator = account.address.toLowerCase() === campaign.creator.toLowerCase();
      const now = Date.now() / 1000;
      const isEnded = now >= Number(campaign.endAt);
      const hasNotClaimed = !campaign.claimed;

      // Can withdraw if: user is creator, campaign ended, goal reached, not claimed yet
      const canWithdraw = isCreator && isEnded && isSuccessful && hasNotClaimed;

      setState({
        isChecking: false,
        isWithdrawing: false,
        canWithdraw,
        campaign,
        error: isCreator ? null : 'Only the campaign creator can withdraw',
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isChecking: false,
        error: error instanceof Error ? error.message : 'Failed to check withdrawal eligibility',
      }));
    }
  }, [account?.address, campaignId]);

  const requestWithdrawal = useCallback(async () => {
    if (!state.canWithdraw) return false;

    setState((prev) => ({ ...prev, isWithdrawing: true, error: null }));

    try {
      const tx = prepareClaim(campaignId);
      await sendTransaction(tx);

      setState((prev) => ({
        ...prev,
        isWithdrawing: false,
        canWithdraw: false,
      }));

      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isWithdrawing: false,
        error: error instanceof Error ? error.message : 'Withdrawal failed',
      }));
      return false;
    }
  }, [campaignId, sendTransaction, state.canWithdraw]);

  const getWithdrawalSummary = useCallback(() => {
    if (!state.campaign) return null;

    const totalAmount = state.campaign.pledged;
    const platformFee = (totalAmount * BigInt(200)) / BigInt(10000); // 2%
    const netAmount = totalAmount - platformFee;

    return {
      totalAmount: toEther(totalAmount),
      platformFee: toEther(platformFee),
      platformFeePercent: '2%',
      netAmount: toEther(netAmount),
    };
  }, [state.campaign]);

  return {
    ...state,
    checkEligibility,
    requestWithdrawal,
    getWithdrawalSummary,
  };
}

/**
 * Hook to claim equity tokens after successful funding
 */
export function useClaimTokens(campaignId: number) {
  const account = useActiveAccount();
  const { mutateAsync: sendTransaction } = useSendTransaction();
  const [state, setState] = useState<ClaimTokensState>({
    isChecking: false,
    isClaiming: false,
    canClaim: false,
    hasClaimed: false,
    pledgeAmount: BigInt(0),
    campaign: null,
    error: null,
  });

  const checkEligibility = useCallback(async () => {
    if (!account?.address) {
      setState((prev) => ({ ...prev, error: 'Please connect your wallet' }));
      return;
    }

    setState((prev) => ({ ...prev, isChecking: true, error: null }));

    try {
      const [campaign, pledgeAmount, isSuccessful, alreadyClaimed] = await Promise.all([
        getCampaign(campaignId),
        getPledge(campaignId, account.address),
        isCampaignSuccessful(campaignId),
        hasClaimedTokens(campaignId, account.address),
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

      // Can claim if: campaign ended, goal reached, user has pledge, not claimed yet
      const canClaim = isEnded && isSuccessful && hasPledge && !alreadyClaimed;

      setState({
        isChecking: false,
        isClaiming: false,
        canClaim,
        hasClaimed: alreadyClaimed,
        pledgeAmount,
        campaign,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isChecking: false,
        error: error instanceof Error ? error.message : 'Failed to check claim eligibility',
      }));
    }
  }, [account?.address, campaignId]);

  const claimTokens = useCallback(async () => {
    if (!state.canClaim) return false;

    setState((prev) => ({ ...prev, isClaiming: true, error: null }));

    try {
      const tx = prepareClaimTokens(campaignId);
      await sendTransaction(tx);

      setState((prev) => ({
        ...prev,
        isClaiming: false,
        canClaim: false,
        hasClaimed: true,
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

/**
 * Hook to claim founder tokens after successful funding (for campaign creator)
 */
export function useClaimFounderTokens(campaignId: number) {
  const account = useActiveAccount();
  const { mutateAsync: sendTransaction } = useSendTransaction();
  const [state, setState] = useState<ClaimFounderTokensState>({
    isChecking: false,
    isClaiming: false,
    canClaim: false,
    hasClaimed: false,
    founderShare: BigInt(0),
    campaign: null,
    error: null,
  });

  const checkEligibility = useCallback(async () => {
    if (!account?.address) {
      setState((prev) => ({ ...prev, error: 'Please connect your wallet' }));
      return;
    }

    setState((prev) => ({ ...prev, isChecking: true, error: null }));

    try {
      const [campaign, isSuccessful] = await Promise.all([
        getCampaign(campaignId),
        isCampaignSuccessful(campaignId),
      ]);

      if (!campaign) {
        setState((prev) => ({
          ...prev,
          isChecking: false,
          error: 'Campaign not found',
        }));
        return;
      }

      const isCreator = account.address.toLowerCase() === campaign.creator.toLowerCase();
      const now = Date.now() / 1000;
      const isEnded = now >= Number(campaign.endAt);
      const hasFounderShare = campaign.founderShareBps > BigInt(0);
      const alreadyClaimed = campaign.founderTokensClaimed;

      // Calculate founder token amount
      const totalTokens = campaign.pledged; // 1:1 with pledged amount
      const founderTokens = (totalTokens * campaign.founderShareBps) / BigInt(10000);

      // Can claim if: user is creator, campaign ended, goal reached, has founder share, not claimed yet
      const canClaim = isCreator && isEnded && isSuccessful && hasFounderShare && !alreadyClaimed;

      setState({
        isChecking: false,
        isClaiming: false,
        canClaim,
        hasClaimed: alreadyClaimed,
        founderShare: founderTokens,
        campaign,
        error: isCreator ? null : 'Only the campaign creator can claim founder tokens',
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isChecking: false,
        error: error instanceof Error ? error.message : 'Failed to check eligibility',
      }));
    }
  }, [account?.address, campaignId]);

  const claimFounderTokens = useCallback(async () => {
    if (!state.canClaim) return false;

    setState((prev) => ({ ...prev, isClaiming: true, error: null }));

    try {
      const tx = prepareClaimFounderTokens(campaignId);
      await sendTransaction(tx);

      setState((prev) => ({
        ...prev,
        isClaiming: false,
        canClaim: false,
        hasClaimed: true,
      }));

      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isClaiming: false,
        error: error instanceof Error ? error.message : 'Founder token claim failed',
      }));
      return false;
    }
  }, [campaignId, sendTransaction, state.canClaim]);

  return {
    ...state,
    checkEligibility,
    claimFounderTokens,
    formatAmount: (amount: bigint) => toEther(amount),
  };
}

/**
 * Hook to get campaign funding status summary
 */
export function useProjectFundingStatus(campaignId: number) {
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCampaign = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getCampaign(campaignId);
      setCampaign(data);
    } catch (error) {
      console.error('Failed to fetch campaign:', error);
    } finally {
      setIsLoading(false);
    }
  }, [campaignId]);

  // Return null if no campaign
  if (!campaign && !isLoading) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const isDeadlinePassed = campaign ? now >= Number(campaign.endAt) : false;
  const isGoalReached = campaign ? campaign.pledged >= campaign.goal : false;

  let status: 'active' | 'funded' | 'failed' | 'loading' = 'loading';
  if (!isLoading && campaign) {
    if (!isDeadlinePassed) {
      status = 'active';
    } else if (isGoalReached) {
      status = 'funded';
    } else {
      status = 'failed';
    }
  }

  return {
    campaign,
    isLoading,
    isDeadlinePassed,
    isGoalReached,
    status,
    progressPercentage: campaign && campaign.goal > BigInt(0)
      ? Number((campaign.pledged * BigInt(100)) / campaign.goal)
      : 0,
    daysRemaining: isDeadlinePassed || !campaign
      ? 0
      : Math.ceil((Number(campaign.endAt) - now) / 86400),
    fetchCampaign,
  };
}
