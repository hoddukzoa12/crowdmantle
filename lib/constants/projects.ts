/**
 * Project Types - Used by UI components for display formatting
 *
 * Note: Mock data has been removed. Campaign data now comes from
 * CrowdfundingEscrow contract via getAllCampaigns() and getCampaign().
 */

export type ProjectCategory = 'tech' | 'fintech' | 'healthcare' | 'ecommerce' | 'entertainment';
export type ProjectStatus = 'active' | 'funded' | 'expired' | 'refunding';

/**
 * Project interface for UI compatibility
 * Maps to on-chain CampaignData for display purposes
 */
export interface Project {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  goal: number; // MNT
  fundRaised: number; // Current amount
  deadline: number; // Unix timestamp
  expectedReturn: number; // % / 6 months
  category: ProjectCategory;
  image: string;
  contractAddress: string;
  walletAddress: string; // Project wallet to receive MNT investments
  status: ProjectStatus;
  investorCount: number;
  minInvestment: number; // MNT
  tokenSymbol: string;
  companyInfo: {
    foundedYear: number;
    employees: number;
    location: string;
    website?: string;
  };
}

/**
 * Calculate funding progress percentage
 */
export function calculateProgress(fundRaised: number, goal: number): number {
  if (goal === 0) return 0;
  return Math.min(100, (fundRaised / goal) * 100);
}

/**
 * Calculate days remaining until deadline
 */
export function daysRemaining(deadline: number): number {
  const now = Math.floor(Date.now() / 1000);
  const diff = deadline - now;
  return Math.max(0, Math.ceil(diff / 86400));
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = 'MNT'): string {
  return `${amount.toLocaleString('en-US')} ${currency}`;
}

/**
 * Get category display name
 */
export function getCategoryLabel(category: ProjectCategory): string {
  const labels: Record<ProjectCategory, string> = {
    tech: 'Tech',
    fintech: 'Fintech',
    healthcare: 'Healthcare',
    ecommerce: 'E-commerce',
    entertainment: 'Entertainment',
  };
  return labels[category];
}

/**
 * Get status display info
 */
export function getStatusInfo(status: ProjectStatus): { label: string; color: string } {
  const info: Record<ProjectStatus, { label: string; color: string }> = {
    active: { label: 'Active', color: 'text-green-600' },
    funded: { label: 'Funded', color: 'text-blue-600' },
    expired: { label: 'Expired', color: 'text-gray-600' },
    refunding: { label: 'Refunding', color: 'text-orange-600' },
  };
  return info[status];
}
