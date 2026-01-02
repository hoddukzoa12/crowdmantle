/**
 * User Repository Interface - Application Layer
 * Port for user data access (Dependency Inversion)
 */

import { User } from '@/src/domain/entities';
import { Address } from '@/src/domain/value-objects';

export interface IUserRepository {
  /**
   * Find a user by their wallet address
   */
  findByAddress(address: Address): Promise<User | null>;

  /**
   * Get or create a user by address
   * Creates a new user if not found
   */
  getOrCreate(address: Address): Promise<User>;

  /**
   * Save a user (create or update)
   */
  save(user: User): Promise<void>;

  /**
   * Update user investment stats
   */
  updateInvestmentStats(
    address: Address,
    totalInvested: number,
    investmentCount: number
  ): Promise<void>;

  /**
   * Update user token holdings count
   */
  updateTokenHoldingsCount(address: Address, tokenHoldingsCount: number): Promise<void>;

  /**
   * Update user's last activity timestamp
   */
  updateLastActivity(address: Address): Promise<void>;

  /**
   * Check if a user exists
   */
  exists(address: Address): Promise<boolean>;
}
