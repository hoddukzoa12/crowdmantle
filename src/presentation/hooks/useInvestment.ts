'use client';

/**
 * useInvestment Hook - Presentation Layer
 * Hook for investment operations using native MNT token via Escrow contract
 *
 * IMPORTANT: Uses proper memoization to prevent infinite re-renders
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useActiveAccount, useSendTransaction } from 'thirdweb/react';
import { toWei } from 'thirdweb';
import { getCrowdfundingService } from '@/src/infrastructure/services';
// Unified contract: both regular and milestone campaigns use the same MilestoneEscrow contract
import { preparePledge, getPledge } from '@/lib/contracts/escrow';

// Simple cache to prevent duplicate RPC calls
const positionCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds cache

interface InvestmentState {
  isPledging: boolean;
  error: string | null;
  step: 'idle' | 'pledging' | 'complete';
}

interface UseInvestmentResult {
  invest: (params: InvestParams) => Promise<boolean>;
  state: InvestmentState;
  isInvesting: boolean;
  currentStep: 'idle' | 'pledging' | 'complete';
  error: string | null;
  reset: () => void;
}

interface InvestParams {
  campaignId: number;
  amountMnt: string;
}

/**
 * Hook for investing in campaigns via Escrow contract
 */
export function useInvestment(): UseInvestmentResult {
  const account = useActiveAccount();
  const { mutateAsync: sendTransaction } = useSendTransaction();

  const [state, setState] = useState<InvestmentState>({
    isPledging: false,
    error: null,
    step: 'idle',
  });

  const reset = useCallback(() => {
    setState({
      isPledging: false,
      error: null,
      step: 'idle',
    });
  }, []);

  const invest = useCallback(
    async (params: InvestParams): Promise<boolean> => {
      if (!account) {
        setState((prev) => ({ ...prev, error: 'Wallet not connected' }));
        return false;
      }

      try {
        // Convert amount to wei
        const amountWei = toWei(params.amountMnt);

        // Call pledge() on unified MilestoneEscrow contract - MNT is held in escrow
        setState((prev) => ({ ...prev, isPledging: true, step: 'pledging', error: null }));

        const pledgeTx = preparePledge(params.campaignId, amountWei);
        await sendTransaction(pledgeTx);

        setState((prev) => ({ ...prev, isPledging: false, step: 'complete' }));

        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Investment failed';
        setState((prev) => ({
          ...prev,
          isPledging: false,
          error: errorMessage,
        }));
        return false;
      }
    },
    [account, sendTransaction]
  );

  const isInvesting = state.isPledging;

  return {
    invest,
    state,
    isInvesting,
    currentStep: state.step,
    error: state.error,
    reset,
  };
}

interface PledgeBalance {
  pledgeAmount: bigint;
  formatted: string;
}

interface UseProjectInvestmentResult {
  balance: PledgeBalance | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  hasInvestment: boolean;
}

/**
 * Hook to get user's pledge amount for a specific campaign
 * Uses the unified MilestoneEscrow contract to fetch pledge amounts
 */
export function useProjectInvestment(campaignId: number): UseProjectInvestmentResult {
  const account = useActiveAccount();

  const crowdfundingService = useMemo(() => {
    return getCrowdfundingService();
  }, []);

  const [balance, setBalance] = useState<PledgeBalance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track if we've already fetched to prevent duplicate calls
  const hasFetchedRef = useRef(false);
  const lastCampaignIdRef = useRef<number>(-1);
  const lastAccountRef = useRef('');

  useEffect(() => {
    const accountAddress = account?.address || '';

    // Skip if nothing changed
    if (
      hasFetchedRef.current &&
      lastCampaignIdRef.current === campaignId &&
      lastAccountRef.current === accountAddress
    ) {
      return;
    }

    if (!accountAddress || campaignId < 0) {
      return;
    }

    // Check cache first
    const cacheKey = `pledge:${accountAddress}:${campaignId}`;
    const cached = positionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setBalance(cached.data as PledgeBalance);
      setIsLoading(false);
      hasFetchedRef.current = true;
      lastCampaignIdRef.current = campaignId;
      lastAccountRef.current = accountAddress;
      return;
    }

    const fetchPledge = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Use unified MilestoneEscrow contract for all campaigns
        const pledgeAmount = await getPledge(campaignId, accountAddress);
        const formattedAmount = crowdfundingService.formatMnt(pledgeAmount);

        const balanceData: PledgeBalance = {
          pledgeAmount,
          formatted: formattedAmount,
        };

        setBalance(balanceData);
        positionCache.set(cacheKey, { data: balanceData, timestamp: Date.now() });
        hasFetchedRef.current = true;
        lastCampaignIdRef.current = campaignId;
        lastAccountRef.current = accountAddress;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch pledge');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPledge();
  }, [account?.address, crowdfundingService, campaignId]);

  const refetch = useCallback(async () => {
    // Clear cache and refs to force refetch
    hasFetchedRef.current = false;
    const cacheKey = `pledge:${account?.address}:${campaignId}`;
    positionCache.delete(cacheKey);
  }, [account?.address, campaignId]);

  const hasInvestment = useMemo(
    () => (balance ? balance.pledgeAmount > BigInt(0) : false),
    [balance]
  );

  return {
    balance,
    isLoading,
    error,
    refetch,
    hasInvestment,
  };
}
