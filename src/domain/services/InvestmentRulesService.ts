/**
 * Investment Rules Service - Domain Layer
 * Business rules for crowdfunding investments (regulatory compliance)
 */

import { Money } from '../value-objects/Money';

export interface InvestmentEligibility {
  eligible: boolean;
  reason?: string;
  remainingLimit: Money;
  warnings: string[];
}

export interface InvestmentLimits {
  annualLimit: Money;
  minInvestment: Money;
  platformFeePercentage: number;
}

export class InvestmentRulesService {
  // Regulatory limits (based on Korean crowdfunding regulations)
  static readonly ANNUAL_LIMIT_USDC = 500; // ~50M KRW
  static readonly MIN_INVESTMENT_USDC = 10;
  static readonly PLATFORM_FEE_PERCENTAGE = 2;
  static readonly FUNDING_PERIOD_MIN_DAYS = 7;
  static readonly FUNDING_PERIOD_MAX_DAYS = 60;

  // Risk warning messages
  static readonly RISK_WARNINGS = {
    PRINCIPAL_LOSS: 'Risk of Loss: You may lose all or part of your invested capital.',
    LIQUIDITY: 'Liquidity Risk: Token resale may be difficult.',
    STARTUP_RISK: 'Startup investments carry high risk.',
    NO_GUARANTEE: 'Expected returns are not guaranteed.',
    VOLATILITY: 'Cryptocurrency investments are subject to high volatility.',
  };

  // Investment confirmation steps
  static readonly CONFIRMATION_STEPS = [
    {
      id: 'risk',
      title: 'Risk Acknowledgment',
      description: 'I understand and accept the investment risks.',
    },
    {
      id: 'limit',
      title: 'Investment Limit',
      description: 'I confirm this investment is within my annual limit.',
    },
    {
      id: 'refund',
      title: 'Refund Policy',
      description: 'I understand the refund terms if funding goal is not met.',
    },
    {
      id: 'confirm',
      title: 'Final Confirmation',
      description: 'I confirm my investment decision.',
    },
  ];

  /**
   * Get default investment limits
   */
  static getDefaultLimits(): InvestmentLimits {
    return {
      annualLimit: Money.fromUSDC(this.ANNUAL_LIMIT_USDC),
      minInvestment: Money.fromUSDC(this.MIN_INVESTMENT_USDC),
      platformFeePercentage: this.PLATFORM_FEE_PERCENTAGE,
    };
  }

  /**
   * Check if an investment amount is eligible
   */
  static checkInvestmentEligibility(
    amount: Money,
    previousAnnualTotal: Money,
    minInvestment: Money
  ): InvestmentEligibility {
    const limits = this.getDefaultLimits();
    const warnings: string[] = [];

    // Check minimum investment
    if (amount.lt(minInvestment)) {
      return {
        eligible: false,
        reason: `Minimum investment is ${minInvestment.toDisplay()}`,
        remainingLimit: limits.annualLimit.subtract(previousAnnualTotal),
        warnings: [],
      };
    }

    // Check annual limit
    const newTotal = previousAnnualTotal.add(amount);
    if (newTotal.gt(limits.annualLimit)) {
      const remaining = limits.annualLimit.subtract(previousAnnualTotal);
      return {
        eligible: false,
        reason: `This investment would exceed your annual limit. Remaining: ${remaining.toDisplay()}`,
        remainingLimit: remaining,
        warnings: [],
      };
    }

    // Add warnings based on investment size
    const remainingAfter = limits.annualLimit.subtract(newTotal);
    if (remainingAfter.toNumber() < 50) {
      warnings.push('You are approaching your annual investment limit.');
    }

    if (amount.toNumber() >= 100) {
      warnings.push(this.RISK_WARNINGS.PRINCIPAL_LOSS);
    }

    return {
      eligible: true,
      remainingLimit: remainingAfter,
      warnings,
    };
  }

  /**
   * Calculate platform fee for an investment
   */
  static calculatePlatformFee(amount: Money): Money {
    return amount.percentage(this.PLATFORM_FEE_PERCENTAGE);
  }

  /**
   * Calculate total amount including fee
   */
  static calculateTotalAmount(amount: Money): Money {
    const fee = this.calculatePlatformFee(amount);
    return amount.add(fee);
  }

  /**
   * Calculate net amount after fee deduction
   */
  static calculateNetAmount(totalAmount: Money): Money {
    const feeRate = this.PLATFORM_FEE_PERCENTAGE / 100;
    const netAmount = totalAmount.toNumber() / (1 + feeRate);
    return Money.fromUSDC(netAmount);
  }

  /**
   * Validate minimum investment requirement
   */
  static validateMinimumInvestment(amount: Money, minRequired: Money): boolean {
    return amount.gte(minRequired);
  }

  /**
   * Validate funding period
   */
  static validateFundingPeriod(days: number): boolean {
    return days >= this.FUNDING_PERIOD_MIN_DAYS && days <= this.FUNDING_PERIOD_MAX_DAYS;
  }

  /**
   * Get all risk warnings
   */
  static getAllRiskWarnings(): string[] {
    return Object.values(this.RISK_WARNINGS);
  }

  /**
   * Format investment limit for display
   */
  static formatLimitDisplay(used: Money, limit: Money): string {
    return `${used.toDisplay()} / ${limit.toDisplay()}`;
  }

  /**
   * Calculate remaining annual limit
   */
  static calculateRemainingLimit(usedAmount: Money): Money {
    const limit = Money.fromUSDC(this.ANNUAL_LIMIT_USDC);
    if (usedAmount.gte(limit)) {
      return Money.zero('USDC');
    }
    return limit.subtract(usedAmount);
  }
}
