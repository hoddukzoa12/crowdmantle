// Type definitions for Milestone-based contracts
// Re-export ProposalStatus and getStatusLabel from governance.ts to avoid duplication
export { ProposalStatus, getStatusLabel as getProposalStatusLabel } from "./governance";

/**
 * Milestone status enum matching the Solidity contract
 */
export enum MilestoneStatus {
  Pending = 0,
  Voting = 1,
  Approved = 2,
  Rejected = 3,
  Released = 4,
}

/**
 * Proposal type enum for GovernanceV2
 */
export enum ProposalType {
  General = 0,
  Milestone = 1,
}

/**
 * Milestone data from the contract
 */
export interface MilestoneData {
  title: string;
  description: string;
  percentage: bigint;
  deadline: bigint;
  status: MilestoneStatus;
  proposalId: bigint;
}

/**
 * Milestone input for campaign creation
 */
export interface MilestoneInput {
  title: string;
  description: string;
  percentage: number; // 0-100
  deadlineDays: number; // days after campaign end
}

/**
 * Extended campaign data with milestones
 */
export interface MilestoneCampaignData {
  creator: string;
  goal: bigint;
  pledged: bigint;
  startAt: bigint;
  endAt: bigint;
  claimed: boolean;
  equityToken: string;
  name: string;
  tokenSymbol: string;
  founderShareBps: bigint;
  founderTokensClaimed: boolean;
  // Order must match Solidity struct
  milestoneCount: bigint;
  releasedAmount: bigint;
  hasMilestones: boolean;
}

/**
 * Extended proposal data for GovernanceV2
 */
export interface ProposalV2Data {
  campaignId: bigint;
  proposer: string;
  title: string;
  description: string;
  forVotes: bigint;
  againstVotes: bigint;
  startTime: bigint;
  endTime: bigint;
  executed: boolean;
  canceled: boolean;
  proposalType: ProposalType;
  milestoneIndex: bigint;
}

/**
 * Helper to get status label from MilestoneStatus
 */
export function getMilestoneStatusLabel(status: MilestoneStatus): string {
  switch (status) {
    case MilestoneStatus.Pending:
      return "Pending";
    case MilestoneStatus.Voting:
      return "Voting";
    case MilestoneStatus.Approved:
      return "Approved";
    case MilestoneStatus.Rejected:
      return "Rejected";
    case MilestoneStatus.Released:
      return "Released";
    default:
      return "Unknown";
  }
}

/**
 * Helper to get proposal type label
 */
export function getProposalTypeLabel(type: ProposalType): string {
  switch (type) {
    case ProposalType.General:
      return "General";
    case ProposalType.Milestone:
      return "Milestone";
    default:
      return "Unknown";
  }
}

/**
 * Calculate milestone amount from pledged amount and percentage
 * @param pledged Total pledged amount in wei
 * @param percentageBps Percentage in basis points (3000 = 30%)
 * @returns Amount for this milestone in wei
 */
export function calculateMilestoneAmount(
  pledged: bigint,
  percentageBps: bigint
): bigint {
  return (pledged * percentageBps) / BigInt(10000);
}

/**
 * Convert percentage to basis points
 * @param percentage 0-100
 * @returns basis points (0-10000)
 */
export function percentageToBps(percentage: number): bigint {
  return BigInt(Math.round(percentage * 100));
}

/**
 * Convert basis points to percentage
 * @param bps 0-10000
 * @returns percentage (0-100)
 */
export function bpsToPercentage(bps: bigint): number {
  return Number(bps) / 100;
}

/**
 * Format milestone deadline from timestamp
 */
export function formatMilestoneDeadline(deadline: bigint): string {
  const date = new Date(Number(deadline) * 1000);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Check if milestone deadline has passed
 */
export function isMilestoneDeadlinePassed(deadline: bigint): boolean {
  return BigInt(Math.floor(Date.now() / 1000)) > deadline;
}

/**
 * Get days remaining until milestone deadline
 */
export function getMilestoneDaysRemaining(deadline: bigint): number {
  const now = Math.floor(Date.now() / 1000);
  const remaining = Number(deadline) - now;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / 86400); // 86400 = seconds per day
}
