/**
 * Crowdfunding Service - Infrastructure Layer
 * Handles investment operations: MNT transfers and Equity Token claims
 * (Using native MNT token for testing on Mantle Sepolia)
 */

import { prepareTransaction, toWei } from 'thirdweb';
import { client, mantleSepolia } from '../blockchain/client';
import { EquityTokenContract } from '../blockchain/contracts/EquityTokenContract';
import type { Chain } from 'thirdweb/chains';

// Platform fee: 2%
const PLATFORM_FEE_BPS = 200; // 2% = 200 basis points
const BPS_DENOMINATOR = 10000;

export interface InvestmentParams {
  projectId: string;
  tokenContractAddress: string;
  projectWalletAddress: string;
  investorAddress: string;
  amountMnt: string; // Amount in MNT
  tokenQuantity: string; // Number of equity tokens to receive
}

export interface InvestmentResult {
  success: boolean;
  transactionHash?: string;
  tokensClaimed?: string;
  error?: string;
}

export interface ProjectFundingStatus {
  totalRaised: bigint;
  goalAmount: bigint;
  investorCount: number;
  isGoalReached: boolean;
  progressPercentage: number;
}

export interface InvestorPosition {
  tokenBalance: bigint;
  tokenSymbol: string;
  investmentValue: bigint; // Estimated value based on token price
}

export class CrowdfundingService {
  private chain: Chain;

  constructor(chain: Chain = mantleSepolia) {
    this.chain = chain;
  }

  /**
   * Calculate platform fee
   */
  calculatePlatformFee(amount: bigint): bigint {
    return (amount * BigInt(PLATFORM_FEE_BPS)) / BigInt(BPS_DENOMINATOR);
  }

  /**
   * Calculate total amount including platform fee
   */
  calculateTotalWithFee(amount: bigint): bigint {
    const fee = this.calculatePlatformFee(amount);
    return amount + fee;
  }

  /**
   * Prepare native MNT transfer transaction to project wallet
   * No approval needed for native token!
   */
  prepareMntTransferTransaction(toAddress: string, amount: bigint) {
    return prepareTransaction({
      client,
      chain: this.chain,
      to: toAddress,
      value: amount,
    });
  }

  /**
   * Get investor's equity token balance for a project
   */
  async getInvestorTokenBalance(
    tokenContractAddress: string,
    investorAddress: string
  ): Promise<bigint> {
    const tokenContract = new EquityTokenContract(tokenContractAddress, this.chain);
    return tokenContract.getBalance(investorAddress);
  }

  /**
   * Get investor's complete position in a project
   */
  async getInvestorPosition(
    tokenContractAddress: string,
    investorAddress: string
  ): Promise<InvestorPosition> {
    const tokenContract = new EquityTokenContract(tokenContractAddress, this.chain);

    const [balance, tokenInfo] = await Promise.all([
      tokenContract.getBalance(investorAddress),
      tokenContract.getTokenInfo(),
    ]);

    // For MVP, investment value = token balance (1:1 with MNT investment)
    return {
      tokenBalance: balance,
      tokenSymbol: tokenInfo.symbol,
      investmentValue: balance,
    };
  }

  /**
   * Check if investor can claim tokens
   */
  async canClaimTokens(
    tokenContractAddress: string,
    investorAddress: string,
    quantity: string
  ): Promise<{ canClaim: boolean; reason?: string }> {
    const tokenContract = new EquityTokenContract(tokenContractAddress, this.chain);
    return tokenContract.checkClaimEligibility(investorAddress, quantity);
  }

  /**
   * Prepare token claim transaction
   * To be executed after MNT transfer is confirmed
   */
  prepareClaimTransaction(
    tokenContractAddress: string,
    investorAddress: string,
    quantity: string
  ) {
    const tokenContract = new EquityTokenContract(tokenContractAddress, this.chain);
    return tokenContract.prepareClaimTransaction(investorAddress, quantity);
  }

  /**
   * Get project's equity token info
   */
  async getProjectTokenInfo(tokenContractAddress: string) {
    const tokenContract = new EquityTokenContract(tokenContractAddress, this.chain);
    return tokenContract.getTokenInfo();
  }

  /**
   * Format MNT amount (18 decimals)
   */
  formatMnt(amount: bigint): string {
    const divisor = BigInt(10 ** 18);
    const integerPart = amount / divisor;
    const fractionalPart = amount % divisor;

    if (fractionalPart === BigInt(0)) {
      return integerPart.toString();
    }

    const fractionalStr = fractionalPart.toString().padStart(18, '0');
    // Trim trailing zeros but keep at least 2 decimal places for display
    const trimmedFractional = fractionalStr.replace(/0+$/, '').slice(0, 4);

    if (trimmedFractional === '') {
      return integerPart.toString();
    }

    return `${integerPart}.${trimmedFractional}`;
  }

  /**
   * Parse MNT amount from string (18 decimals)
   */
  parseMnt(amount: string): bigint {
    return toWei(amount);
  }
}

/**
 * Refund eligibility check result
 */
export interface RefundEligibility {
  canRefund: boolean;
  reason?: string;
  refundAmount?: bigint;
}

/**
 * Withdrawal eligibility check result
 */
export interface WithdrawalEligibility {
  canWithdraw: boolean;
  reason?: string;
  withdrawAmount?: bigint;
  platformFee?: bigint;
  netAmount?: bigint;
}

/**
 * Check if a project is eligible for refund
 * Conditions: Deadline passed AND goal not reached
 */
export function checkRefundEligibility(
  deadline: number,
  fundRaised: number,
  goal: number,
  investorTokenBalance: bigint
): RefundEligibility {
  const now = Math.floor(Date.now() / 1000);

  // Check if deadline has passed
  if (now < deadline) {
    return {
      canRefund: false,
      reason: '펀딩 기간이 아직 종료되지 않았습니다.',
    };
  }

  // Check if goal was not reached
  if (fundRaised >= goal) {
    return {
      canRefund: false,
      reason: '목표 금액이 달성되어 환불 대상이 아닙니다.',
    };
  }

  // Check if investor has tokens to refund
  if (investorTokenBalance <= BigInt(0)) {
    return {
      canRefund: false,
      reason: '환불 가능한 투자 내역이 없습니다.',
    };
  }

  // Refund amount = token balance (1:1 with MNT)
  return {
    canRefund: true,
    refundAmount: investorTokenBalance,
  };
}

/**
 * Check if a project is eligible for withdrawal (founder)
 * Conditions: Deadline passed AND goal reached
 */
export function checkWithdrawalEligibility(
  deadline: number,
  fundRaised: number,
  goal: number
): WithdrawalEligibility {
  const now = Math.floor(Date.now() / 1000);

  // Check if deadline has passed
  if (now < deadline) {
    return {
      canWithdraw: false,
      reason: '펀딩 기간이 아직 종료되지 않았습니다.',
    };
  }

  // Check if goal was reached
  if (fundRaised < goal) {
    return {
      canWithdraw: false,
      reason: '목표 금액 미달성으로 인출이 불가합니다.',
    };
  }

  // Calculate amounts (fundRaised is in MNT units)
  const totalAmount = BigInt(Math.floor(fundRaised * 10 ** 18));
  const platformFee = (totalAmount * BigInt(PLATFORM_FEE_BPS)) / BigInt(BPS_DENOMINATOR);
  const netAmount = totalAmount - platformFee;

  return {
    canWithdraw: true,
    withdrawAmount: totalAmount,
    platformFee,
    netAmount,
  };
}

// Export singleton instance
let crowdfundingServiceInstance: CrowdfundingService | null = null;

export function getCrowdfundingService(): CrowdfundingService {
  if (!crowdfundingServiceInstance) {
    crowdfundingServiceInstance = new CrowdfundingService();
  }
  return crowdfundingServiceInstance;
}
