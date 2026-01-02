/**
 * Equity Token Contract - Infrastructure Layer
 * Wrapper for Thirdweb DropERC20 contract interactions
 */

import { getContract, readContract, type ThirdwebContract } from 'thirdweb';
import {
  claimTo,
  getActiveClaimCondition,
  canClaim,
  balanceOf,
  totalSupply,
} from 'thirdweb/extensions/erc20';
import { client, mantleSepolia } from '../client';
import type { Chain } from 'thirdweb/chains';

export interface ClaimCondition {
  startTimestamp: bigint;
  maxClaimableSupply: bigint;
  supplyClaimed: bigint;
  quantityLimitPerWallet: bigint;
  pricePerToken: bigint;
  currency: string;
}

export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
}

export interface ClaimEligibility {
  canClaim: boolean;
  reason?: string;
}

export class EquityTokenContract {
  private contract: ThirdwebContract;

  constructor(
    tokenAddress: string,
    chain: Chain = mantleSepolia
  ) {
    this.contract = getContract({
      client,
      address: tokenAddress,
      chain,
    });
  }

  /**
   * Get the underlying Thirdweb contract
   */
  getContract(): ThirdwebContract {
    return this.contract;
  }

  /**
   * Get token information (name, symbol, decimals, totalSupply)
   */
  async getTokenInfo(): Promise<TokenInfo> {
    const [tokenName, tokenSymbol, tokenDecimals, supply] = await Promise.all([
      readContract({
        contract: this.contract,
        method: 'function name() view returns (string)',
        params: [],
      }),
      readContract({
        contract: this.contract,
        method: 'function symbol() view returns (string)',
        params: [],
      }),
      readContract({
        contract: this.contract,
        method: 'function decimals() view returns (uint8)',
        params: [],
      }),
      totalSupply({ contract: this.contract }),
    ]);

    return {
      name: tokenName,
      symbol: tokenSymbol,
      decimals: tokenDecimals,
      totalSupply: supply,
    };
  }

  /**
   * Get token balance for an address
   */
  async getBalance(address: string): Promise<bigint> {
    return balanceOf({
      contract: this.contract,
      address,
    });
  }

  /**
   * Get the active claim condition
   */
  async getActiveClaimCondition(): Promise<ClaimCondition | null> {
    try {
      const condition = await getActiveClaimCondition({
        contract: this.contract,
      });

      return {
        startTimestamp: condition.startTimestamp,
        maxClaimableSupply: condition.maxClaimableSupply,
        supplyClaimed: condition.supplyClaimed,
        quantityLimitPerWallet: condition.quantityLimitPerWallet,
        pricePerToken: condition.pricePerToken,
        currency: condition.currency,
      };
    } catch {
      return null;
    }
  }

  /**
   * Check if an address can claim tokens
   */
  async checkClaimEligibility(
    claimerAddress: string,
    quantity: string
  ): Promise<ClaimEligibility> {
    try {
      const eligibility = await canClaim({
        contract: this.contract,
        claimer: claimerAddress,
        quantity,
      });

      return {
        canClaim: eligibility.result,
        reason: eligibility.result ? undefined : 'Not eligible to claim',
      };
    } catch (error) {
      return {
        canClaim: false,
        reason: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Prepare a claim transaction (to be sent via useSendTransaction)
   */
  prepareClaimTransaction(to: string, quantity: string) {
    return claimTo({
      contract: this.contract,
      to,
      quantity,
    });
  }

  /**
   * Format token amount for display (considering decimals)
   */
  formatAmount(amount: bigint, tokenDecimals: number = 18): string {
    const divisor = BigInt(10 ** tokenDecimals);
    const integerPart = amount / divisor;
    const fractionalPart = amount % divisor;

    if (fractionalPart === BigInt(0)) {
      return integerPart.toString();
    }

    const fractionalStr = fractionalPart.toString().padStart(tokenDecimals, '0');
    const trimmedFractional = fractionalStr.replace(/0+$/, '');

    return `${integerPart}.${trimmedFractional}`;
  }

  /**
   * Parse token amount from string (considering decimals)
   */
  parseAmount(amount: string, tokenDecimals: number = 18): bigint {
    const [integerPart, fractionalPart = ''] = amount.split('.');
    const paddedFractional = fractionalPart.padEnd(tokenDecimals, '0').slice(0, tokenDecimals);
    return BigInt(integerPart + paddedFractional);
  }
}
