/**
 * TokenId Value Object - Domain Layer
 * Immutable representation of token identifiers
 */

export class TokenId {
  private constructor(private readonly value: bigint) {
    if (value < BigInt(0)) {
      throw new Error('TokenId cannot be negative');
    }
  }

  // Factory methods
  static create(id: bigint | string | number): TokenId {
    if (typeof id === 'string') {
      return new TokenId(BigInt(id));
    }
    if (typeof id === 'number') {
      return new TokenId(BigInt(id));
    }
    return new TokenId(id);
  }

  static fromString(id: string): TokenId {
    return TokenId.create(id);
  }

  static zero(): TokenId {
    return new TokenId(BigInt(0));
  }

  // Getters
  toString(): string {
    return this.value.toString();
  }

  toBigInt(): bigint {
    return this.value;
  }

  toNumber(): number {
    if (this.value > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error('TokenId too large to convert to number safely');
    }
    return Number(this.value);
  }

  // Comparison
  equals(other: TokenId): boolean {
    return this.value === other.value;
  }

  gt(other: TokenId): boolean {
    return this.value > other.value;
  }

  lt(other: TokenId): boolean {
    return this.value < other.value;
  }

  isZero(): boolean {
    return this.value === BigInt(0);
  }

  // Arithmetic (returns new TokenId)
  increment(): TokenId {
    return new TokenId(this.value + BigInt(1));
  }
}
