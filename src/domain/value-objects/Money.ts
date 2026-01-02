/**
 * Money Value Object - Domain Layer
 * Immutable representation of monetary values with currency support
 */

export type Currency = 'USDC' | 'ETH' | 'MNT';

export class Money {
  private constructor(
    private readonly amount: number,
    private readonly currency: Currency = 'USDC',
    private readonly decimals: number = 6
  ) {
    if (amount < 0) {
      throw new Error('Money amount cannot be negative');
    }
  }

  // Factory methods
  static fromUSDC(amount: number): Money {
    return new Money(amount, 'USDC', 6);
  }

  static fromETH(amount: number): Money {
    return new Money(amount, 'ETH', 18);
  }

  static fromMNT(amount: number): Money {
    return new Money(amount, 'MNT', 18);
  }

  static fromWei(wei: bigint, currency: Currency = 'ETH'): Money {
    const decimals = currency === 'USDC' ? 6 : 18;
    const amount = Number(wei) / Math.pow(10, decimals);
    return new Money(amount, currency, decimals);
  }

  static zero(currency: Currency = 'USDC'): Money {
    return new Money(0, currency, currency === 'USDC' ? 6 : 18);
  }

  // Getters
  getAmount(): number {
    return this.amount;
  }

  getCurrency(): Currency {
    return this.currency;
  }

  getDecimals(): number {
    return this.decimals;
  }

  // Arithmetic operations (immutable - returns new Money)
  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount + other.amount, this.currency, this.decimals);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    const result = this.amount - other.amount;
    if (result < 0) {
      throw new Error('Subtraction would result in negative amount');
    }
    return new Money(result, this.currency, this.decimals);
  }

  multiply(factor: number): Money {
    if (factor < 0) {
      throw new Error('Multiplication factor cannot be negative');
    }
    return new Money(this.amount * factor, this.currency, this.decimals);
  }

  percentage(percent: number): Money {
    return this.multiply(percent / 100);
  }

  // Comparison operations
  equals(other: Money): boolean {
    return (
      this.currency === other.currency &&
      Math.abs(this.amount - other.amount) < Number.EPSILON
    );
  }

  gt(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount > other.amount;
  }

  gte(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount >= other.amount;
  }

  lt(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount < other.amount;
  }

  lte(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount <= other.amount;
  }

  // Conversion methods
  toNumber(): number {
    return this.amount;
  }

  toWei(): bigint {
    return BigInt(Math.floor(this.amount * Math.pow(10, this.decimals)));
  }

  toDisplay(locale: string = 'en-US'): string {
    return `${this.amount.toLocaleString(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })} ${this.currency}`;
  }

  toString(): string {
    return this.toDisplay();
  }

  // Private helpers
  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(
        `Cannot operate on different currencies: ${this.currency} and ${other.currency}`
      );
    }
  }
}
