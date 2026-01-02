'use client';

/**
 * useWallet Hook - Presentation Layer
 * Hook for wallet connection and balance information
 */

import { useMemo } from 'react';
import {
  useActiveAccount,
  useActiveWallet,
  useWalletBalance,
  useDisconnect,
  useSwitchActiveWalletChain,
} from 'thirdweb/react';
import { mantleSepolia } from '@/lib/thirdweb/chains';
import { client } from '@/lib/thirdweb/client';

interface WalletInfo {
  address: string;
  shortAddress: string;
  balance: string;
  balanceRaw: bigint;
  symbol: string;
  chainId: number;
  chainName: string;
  isConnected: boolean;
  isCorrectChain: boolean;
}

interface UseWalletResult {
  wallet: WalletInfo | null;
  isConnected: boolean;
  isLoading: boolean;
  disconnect: () => void;
  switchToMantle: () => Promise<void>;
}

export function useWallet(): UseWalletResult {
  const account = useActiveAccount();
  const activeWallet = useActiveWallet();
  const { disconnect: disconnectWallet } = useDisconnect();
  const switchChain = useSwitchActiveWalletChain();

  const { data: balanceData, isLoading: isBalanceLoading } = useWalletBalance({
    client,
    chain: mantleSepolia,
    address: account?.address,
  });

  const wallet: WalletInfo | null = useMemo(() => {
    if (!account) return null;

    const address = account.address;
    const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

    return {
      address,
      shortAddress,
      balance: balanceData?.displayValue || '0',
      balanceRaw: balanceData?.value || BigInt(0),
      symbol: balanceData?.symbol || 'MNT',
      chainId: mantleSepolia.id,
      chainName: mantleSepolia.name || 'Mantle Sepolia',
      isConnected: true,
      isCorrectChain: true, // We're always on Mantle Sepolia in this app
    };
  }, [account, balanceData]);

  const disconnect = () => {
    if (activeWallet) {
      disconnectWallet(activeWallet);
    }
  };

  const switchToMantle = async () => {
    await switchChain(mantleSepolia);
  };

  return {
    wallet,
    isConnected: !!account,
    isLoading: isBalanceLoading,
    disconnect,
    switchToMantle,
  };
}

/**
 * Hook to get native MNT balance
 */
export function useMNTBalance() {
  const account = useActiveAccount();

  const { data: balanceData, isLoading } = useWalletBalance({
    client,
    chain: mantleSepolia,
    address: account?.address,
  });

  return {
    balance: balanceData?.displayValue || '0',
    balanceRaw: balanceData?.value || BigInt(0),
    symbol: 'MNT',
    isLoading,
  };
}

// Alias for backward compatibility
export const useUSDCBalance = useMNTBalance;
