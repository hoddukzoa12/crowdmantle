/**
 * User Entity - Domain Layer
 * Represents a user/investor on the CrowdMantle platform
 */

import { Money } from '../value-objects/Money';
import { Address } from '../value-objects/Address';

export interface UserProps {
  address: Address;
  totalInvested: Money;
  investmentCount: number;
  tokenHoldingsCount: number;
  annualInvestmentTotal: Money;
  createdAt: Date;
  lastActivityAt: Date;
}

export class User {
  private constructor(private readonly props: UserProps) {}

  static create(props: UserProps): User {
    return new User(props);
  }

  static createNew(address: Address): User {
    const now = new Date();
    return new User({
      address,
      totalInvested: Money.zero('USDC'),
      investmentCount: 0,
      tokenHoldingsCount: 0,
      annualInvestmentTotal: Money.zero('USDC'),
      createdAt: now,
      lastActivityAt: now,
    });
  }

  // Getters
  get address(): Address {
    return this.props.address;
  }

  get totalInvested(): Money {
    return this.props.totalInvested;
  }

  get investmentCount(): number {
    return this.props.investmentCount;
  }

  get tokenHoldingsCount(): number {
    return this.props.tokenHoldingsCount;
  }

  get annualInvestmentTotal(): Money {
    return this.props.annualInvestmentTotal;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get lastActivityAt(): Date {
    return this.props.lastActivityAt;
  }

  // Business logic
  getRemainingAnnualLimit(maxLimit: Money): Money {
    if (this.props.annualInvestmentTotal.gte(maxLimit)) {
      return Money.zero(maxLimit.getCurrency());
    }
    return maxLimit.subtract(this.props.annualInvestmentTotal);
  }

  canInvest(amount: Money, maxLimit: Money): boolean {
    const remaining = this.getRemainingAnnualLimit(maxLimit);
    return amount.lte(remaining);
  }

  getAnnualLimitUsagePercentage(maxLimit: Money): number {
    const maxAmount = maxLimit.toNumber();
    if (maxAmount === 0) return 0;
    return Math.min(100, (this.props.annualInvestmentTotal.toNumber() / maxAmount) * 100);
  }

  hasInvestments(): boolean {
    return this.props.investmentCount > 0;
  }

  hasTokenHoldings(): boolean {
    return this.props.tokenHoldingsCount > 0;
  }

  // Display helpers
  getDisplayAddress(): string {
    return this.props.address.truncate();
  }
}
