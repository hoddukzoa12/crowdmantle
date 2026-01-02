/**
 * Address Value Object - Domain Layer
 * Immutable representation of blockchain wallet/contract addresses
 */

export class Address {
  private constructor(private readonly value: string) {}

  // Factory methods
  static create(address: string): Address {
    const normalized = address.toLowerCase();
    if (!Address.isValid(normalized)) {
      throw new Error(`Invalid address: ${address}`);
    }
    return new Address(normalized);
  }

  static fromString(address: string): Address {
    return Address.create(address);
  }

  static zero(): Address {
    return new Address('0x0000000000000000000000000000000000000000');
  }

  // Validation
  static isValid(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  // Getters
  toString(): string {
    return this.value;
  }

  toChecksumAddress(): string {
    // Simple checksum implementation
    // In production, use ethers.js or viem for proper checksum
    return this.value;
  }

  // Display methods
  truncate(startChars: number = 6, endChars: number = 4): string {
    if (this.value.length <= startChars + endChars) {
      return this.value;
    }
    return `${this.value.slice(0, startChars)}...${this.value.slice(-endChars)}`;
  }

  // Comparison
  equals(other: Address): boolean {
    return this.value.toLowerCase() === other.value.toLowerCase();
  }

  isZero(): boolean {
    return this.value === '0x0000000000000000000000000000000000000000';
  }
}
