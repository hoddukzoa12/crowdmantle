/**
 * Investment Repository Interface - Application Layer
 * Port for investment data access (Dependency Inversion)
 */

import { Investment, InvestmentStatus } from '@/src/domain/entities';
import { Address } from '@/src/domain/value-objects';

export interface InvestmentFilters {
  projectId?: string;
  investor?: string;
  status?: InvestmentStatus;
  minAmount?: number;
  maxAmount?: number;
}

export interface InvestmentSortOptions {
  field: 'createdAt' | 'amount';
  order: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface IInvestmentRepository {
  /**
   * Find all investments with optional filtering
   */
  findAll(
    filters?: InvestmentFilters,
    sort?: InvestmentSortOptions,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Investment>>;

  /**
   * Find an investment by its ID
   */
  findById(id: string): Promise<Investment | null>;

  /**
   * Find all investments by an investor
   */
  findByInvestor(address: Address): Promise<Investment[]>;

  /**
   * Find all investments in a project
   */
  findByProject(projectId: string): Promise<Investment[]>;

  /**
   * Find investments by transaction hash
   */
  findByTransactionHash(hash: string): Promise<Investment | null>;

  /**
   * Get total invested amount by an investor (annual)
   */
  getAnnualTotalByInvestor(address: Address, year?: number): Promise<number>;

  /**
   * Get total invested amount in a project
   */
  getTotalByProject(projectId: string): Promise<number>;

  /**
   * Get investor count for a project
   */
  getInvestorCountByProject(projectId: string): Promise<number>;

  /**
   * Save an investment
   */
  save(investment: Investment): Promise<void>;

  /**
   * Update investment status
   */
  updateStatus(id: string, status: InvestmentStatus): Promise<void>;
}
