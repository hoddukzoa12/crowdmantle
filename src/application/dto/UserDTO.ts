/**
 * User Data Transfer Object - Application Layer
 * Used for data transfer between layers
 */

export interface UserDTO {
  address: string;
  displayAddress: string;
  totalInvested: number;
  investmentCount: number;
  tokenHoldingsCount: number;
  annualInvestmentTotal: number;
  remainingAnnualLimit: number;
  annualLimitUsagePercentage: number;
  currency: string;
  createdAt: string; // ISO date string
  lastActivityAt: string;
}

export interface UserSummaryDTO {
  address: string;
  displayAddress: string;
  investmentCount: number;
  tokenHoldingsCount: number;
}

export interface UserStatsDTO {
  totalInvested: number;
  investmentCount: number;
  tokenHoldingsCount: number;
  annualInvestmentTotal: number;
  remainingAnnualLimit: number;
  annualLimit: number;
  limitUsagePercentage: number;
  currency: string;
}
