'use client';

/**
 * useEquityToken Hook - Presentation Layer
 * Hook for equity token queries and information
 *
 * IMPORTANT: Uses proper memoization to prevent infinite re-renders
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { EquityTokenContract, type TokenInfo, type ClaimCondition } from '@/src/infrastructure/blockchain/contracts';

// Simple cache to prevent duplicate RPC calls
const balanceCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds cache

function getCachedData<T>(key: string): T | null {
  const cached = balanceCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }
  return null;
}

function setCachedData<T>(key: string, data: T): void {
  balanceCache.set(key, { data, timestamp: Date.now() });
}

interface TokenBalance {
  balance: bigint;
  formatted: string;
  isLoading: boolean;
  error: string | null;
}

interface UseEquityTokenResult {
  tokenInfo: TokenInfo | null;
  balance: TokenBalance;
  claimCondition: ClaimCondition | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to get equity token information and user balance
 */
export function useEquityToken(tokenContractAddress: string): UseEquityTokenResult {
  const account = useActiveAccount();

  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [claimCondition, setClaimCondition] = useState<ClaimCondition | null>(null);
  const [balance, setBalance] = useState<TokenBalance>({
    balance: BigInt(0),
    formatted: '0',
    isLoading: false,
    error: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTokenData = useCallback(async () => {
    if (!tokenContractAddress || tokenContractAddress === '0x0000000000000000000000000000000000000000') {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const tokenContract = new EquityTokenContract(tokenContractAddress);

      // Fetch token info and claim condition in parallel
      const [info, condition] = await Promise.all([
        tokenContract.getTokenInfo(),
        tokenContract.getActiveClaimCondition(),
      ]);

      setTokenInfo(info);
      setClaimCondition(condition);

      // Fetch balance if user is connected
      if (account?.address) {
        setBalance((prev) => ({ ...prev, isLoading: true }));
        const userBalance = await tokenContract.getBalance(account.address);
        const formattedBalance = tokenContract.formatAmount(userBalance, info.decimals);

        setBalance({
          balance: userBalance,
          formatted: formattedBalance,
          isLoading: false,
          error: null,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch token data';
      setError(errorMessage);
      setBalance((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    } finally {
      setIsLoading(false);
    }
  }, [tokenContractAddress, account?.address]);

  useEffect(() => {
    fetchTokenData();
  }, [fetchTokenData]);

  return {
    tokenInfo,
    balance,
    claimCondition,
    isLoading,
    error,
    refetch: fetchTokenData,
  };
}

/**
 * Hook to get user's equity token balances across multiple projects
 * FIXED: Uses stable reference for tokenAddresses to prevent infinite re-renders
 */
export function useMultipleTokenBalances(tokenAddresses: string[]) {
  const account = useActiveAccount();

  // Create stable reference for tokenAddresses using JSON serialization
  const addressesKey = useMemo(() => tokenAddresses.sort().join(','), [tokenAddresses]);

  const [balances, setBalances] = useState<
    Record<string, { balance: bigint; symbol: string; formatted: string }>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track if we've already fetched to prevent duplicate calls
  const hasFetchedRef = useRef(false);
  const lastAddressKeyRef = useRef('');
  const lastAccountRef = useRef('');

  useEffect(() => {
    const accountAddress = account?.address || '';

    // Skip if nothing changed
    if (
      hasFetchedRef.current &&
      lastAddressKeyRef.current === addressesKey &&
      lastAccountRef.current === accountAddress
    ) {
      return;
    }

    // Skip if no account or no addresses
    if (!accountAddress || tokenAddresses.length === 0) {
      setIsLoading(false);
      return;
    }

    // Check cache first
    const cacheKey = `balances:${accountAddress}:${addressesKey}`;
    const cachedBalances = getCachedData<Record<string, { balance: bigint; symbol: string; formatted: string }>>(cacheKey);

    if (cachedBalances) {
      setBalances(cachedBalances);
      setIsLoading(false);
      hasFetchedRef.current = true;
      lastAddressKeyRef.current = addressesKey;
      lastAccountRef.current = accountAddress;
      return;
    }

    const fetchBalances = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch balances sequentially with delay to avoid rate limiting
        const balanceMap: Record<string, { balance: bigint; symbol: string; formatted: string }> = {};

        for (const address of tokenAddresses) {
          if (address === '0x0000000000000000000000000000000000000000') {
            balanceMap[address] = { balance: BigInt(0), symbol: '', formatted: '0' };
            continue;
          }

          try {
            const tokenContract = new EquityTokenContract(address);
            const [balance, info] = await Promise.all([
              tokenContract.getBalance(accountAddress),
              tokenContract.getTokenInfo(),
            ]);

            balanceMap[address] = {
              balance,
              symbol: info.symbol,
              formatted: tokenContract.formatAmount(balance, info.decimals),
            };

            // Small delay between requests to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (err) {
            // Skip failed tokens but continue with others
            console.warn(`Failed to fetch balance for ${address}:`, err);
            balanceMap[address] = { balance: BigInt(0), symbol: '', formatted: '0' };
          }
        }

        setBalances(balanceMap);
        setCachedData(cacheKey, balanceMap);
        hasFetchedRef.current = true;
        lastAddressKeyRef.current = addressesKey;
        lastAccountRef.current = accountAddress;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch balances');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalances();
  }, [account?.address, addressesKey, tokenAddresses]);

  const refetch = useCallback(async () => {
    // Clear cache and refs to force refetch
    hasFetchedRef.current = false;
    const cacheKey = `balances:${account?.address}:${addressesKey}`;
    balanceCache.delete(cacheKey);
  }, [account?.address, addressesKey]);

  const totalProjects = useMemo(
    () => Object.values(balances).filter((b) => b.balance > BigInt(0)).length,
    [balances]
  );

  return {
    balances,
    isLoading,
    error,
    refetch,
    totalProjects,
  };
}

/**
 * Hook to check if user can claim tokens
 */
export function useClaimEligibility(tokenContractAddress: string, quantity: string) {
  const account = useActiveAccount();

  const [canClaim, setCanClaim] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkEligibility = useCallback(async () => {
    if (!account?.address || !tokenContractAddress || !quantity) {
      setCanClaim(false);
      return;
    }

    if (tokenContractAddress === '0x0000000000000000000000000000000000000000') {
      setCanClaim(false);
      setReason('Token contract not configured');
      return;
    }

    setIsChecking(true);

    try {
      const tokenContract = new EquityTokenContract(tokenContractAddress);
      const eligibility = await tokenContract.checkClaimEligibility(account.address, quantity);

      setCanClaim(eligibility.canClaim);
      setReason(eligibility.reason || null);
    } catch (err) {
      setCanClaim(false);
      setReason(err instanceof Error ? err.message : 'Failed to check eligibility');
    } finally {
      setIsChecking(false);
    }
  }, [account?.address, tokenContractAddress, quantity]);

  useEffect(() => {
    checkEligibility();
  }, [checkEligibility]);

  return {
    canClaim,
    reason,
    isChecking,
    recheck: checkEligibility,
  };
}
