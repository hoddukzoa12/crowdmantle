/**
 * Investment Data Transfer Object - Application Layer
 * Used for data transfer between layers
 */

import { InvestmentStatus } from '@/src/domain/entities';

export interface InvestmentDTO {
  id: string;
  projectId: string;
  projectName?: string;
  investor: string;
  amount: number;
  currency: string;
  platformFee: number;
  totalAmount: number;
  tokenAmount: number;
  tokenSymbol: string;
  transactionHash: string;
  status: InvestmentStatus;
  createdAt: string; // ISO date string
  confirmedAt?: string;
  refundedAt?: string;
  explorerUrl?: string;
}

export interface InvestmentSummaryDTO {
  id: string;
  projectId: string;
  projectName: string;
  amount: number;
  currency: string;
  status: InvestmentStatus;
  createdAt: string;
  expectedReturn?: number;
}

export interface CreateInvestmentDTO {
  projectId: string;
  amount: number;
}

export interface InvestmentStatsDTO {
  totalInvested: number;
  investmentCount: number;
  annualTotal: number;
  annualLimit: number;
  remainingLimit: number;
  currency: string;
}
