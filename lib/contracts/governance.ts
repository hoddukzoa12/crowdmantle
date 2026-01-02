// GovernanceV2 contract utilities
// For interacting with the governance contract via Thirdweb SDK

import { getContract, prepareContractCall, readContract } from "thirdweb";
import { mantleSepolia } from "@/lib/thirdweb/chains";
import { client } from "@/lib/thirdweb/client";
import { CONTRACTS } from "@/lib/constants/addresses";
import { GOVERNANCE_V2_ABI } from "./abis";

// Contract instance (GovernanceV2)
export function getGovernanceContract() {
  return getContract({
    client,
    chain: mantleSepolia,
    address: CONTRACTS.GOVERNANCE_V2,
    abi: GOVERNANCE_V2_ABI,
  });
}

// Type definitions for proposal data
export interface ProposalData {
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
}

// Proposal status enum
export enum ProposalStatus {
  Pending = 0,
  Active = 1,
  Ended = 2,
  Executed = 3,
  Canceled = 4,
}

export function getStatusLabel(status: ProposalStatus): string {
  switch (status) {
    case ProposalStatus.Pending:
      return "Pending";
    case ProposalStatus.Active:
      return "Active";
    case ProposalStatus.Ended:
      return "Ended";
    case ProposalStatus.Executed:
      return "Executed";
    case ProposalStatus.Canceled:
      return "Canceled";
    default:
      return "Unknown";
  }
}

// ============ Read Functions ============

/**
 * Get proposal details by ID
 */
export async function getProposal(proposalId: number): Promise<ProposalData | null> {
  const contract = getGovernanceContract();

  try {
    const result = await readContract({
      contract,
      method: "getProposal",
      params: [BigInt(proposalId)],
    });
    return result as unknown as ProposalData;
  } catch (error) {
    console.error("Error reading proposal:", error);
    return null;
  }
}

/**
 * Get total number of proposals
 */
export async function getProposalCount(): Promise<number> {
  const contract = getGovernanceContract();

  try {
    const result = await readContract({
      contract,
      method: "proposalCount",
      params: [],
    });
    return Number(result);
  } catch (error) {
    console.error("Error reading proposal count:", error);
    return 0;
  }
}

/**
 * Get all proposal IDs for a campaign
 */
export async function getCampaignProposals(campaignId: number): Promise<number[]> {
  const contract = getGovernanceContract();

  try {
    const result = await readContract({
      contract,
      method: "getCampaignProposals",
      params: [BigInt(campaignId)],
    });
    return (result as bigint[]).map((id) => Number(id));
  } catch (error) {
    console.error("Error reading campaign proposals:", error);
    return [];
  }
}

/**
 * Get all proposals for a campaign with full details
 */
export async function getCampaignProposalsWithDetails(
  campaignId: number
): Promise<(ProposalData & { id: number })[]> {
  const proposalIds = await getCampaignProposals(campaignId);
  const proposals: (ProposalData & { id: number })[] = [];

  for (const id of proposalIds) {
    const proposal = await getProposal(id);
    if (proposal) {
      proposals.push({ ...proposal, id });
    }
  }

  return proposals;
}

/**
 * Get proposal status
 * Returns: 0=pending, 1=active, 2=ended, 3=executed, 4=canceled
 */
export async function getProposalStatus(proposalId: number): Promise<ProposalStatus> {
  const contract = getGovernanceContract();

  try {
    const result = await readContract({
      contract,
      method: "getProposalStatus",
      params: [BigInt(proposalId)],
    });
    return Number(result) as ProposalStatus;
  } catch (error) {
    console.error("Error reading proposal status:", error);
    return ProposalStatus.Pending;
  }
}

/**
 * Get voting results
 */
export async function getVotingResults(
  proposalId: number
): Promise<{ forPercent: number; againstPercent: number; totalVotes: bigint }> {
  const contract = getGovernanceContract();

  try {
    const result = await readContract({
      contract,
      method: "getVotingResults",
      params: [BigInt(proposalId)],
    });
    const [forPercent, againstPercent, totalVotes] = result as [bigint, bigint, bigint];
    return {
      forPercent: Number(forPercent),
      againstPercent: Number(againstPercent),
      totalVotes,
    };
  } catch (error) {
    console.error("Error reading voting results:", error);
    return { forPercent: 0, againstPercent: 0, totalVotes: BigInt(0) };
  }
}

/**
 * Check if proposal passed
 */
export async function proposalPassed(proposalId: number): Promise<boolean> {
  const contract = getGovernanceContract();

  try {
    const result = await readContract({
      contract,
      method: "proposalPassed",
      params: [BigInt(proposalId)],
    });
    return result as boolean;
  } catch (error) {
    console.error("Error checking proposal passed:", error);
    return false;
  }
}

/**
 * Check if address has voted on a proposal
 */
export async function hasAddressVoted(proposalId: number, voter: string): Promise<boolean> {
  const contract = getGovernanceContract();

  try {
    const result = await readContract({
      contract,
      method: "hasAddressVoted",
      params: [BigInt(proposalId), voter],
    });
    return result as boolean;
  } catch (error) {
    console.error("Error checking vote status:", error);
    return false;
  }
}

/**
 * Get vote weight used by an address
 */
export async function getVoteWeight(proposalId: number, voter: string): Promise<bigint> {
  const contract = getGovernanceContract();

  try {
    const result = await readContract({
      contract,
      method: "getVoteWeight",
      params: [BigInt(proposalId), voter],
    });
    return result as bigint;
  } catch (error) {
    console.error("Error reading vote weight:", error);
    return BigInt(0);
  }
}

/**
 * Get time remaining for voting
 */
export async function getTimeRemaining(proposalId: number): Promise<number> {
  const contract = getGovernanceContract();

  try {
    const result = await readContract({
      contract,
      method: "getTimeRemaining",
      params: [BigInt(proposalId)],
    });
    return Number(result);
  } catch (error) {
    console.error("Error reading time remaining:", error);
    return 0;
  }
}

// ============ Write Function Preparations ============

/**
 * Prepare createProposal transaction
 */
export function prepareCreateProposal(campaignId: number, title: string, description: string) {
  const contract = getGovernanceContract();

  return prepareContractCall({
    contract,
    method: "createProposal",
    params: [BigInt(campaignId), title, description],
  });
}

/**
 * Prepare vote transaction
 */
export function prepareVote(proposalId: number, support: boolean) {
  const contract = getGovernanceContract();

  return prepareContractCall({
    contract,
    method: "vote",
    params: [BigInt(proposalId), support],
  });
}

/**
 * Prepare executeProposal transaction
 */
export function prepareExecuteProposal(proposalId: number) {
  const contract = getGovernanceContract();

  return prepareContractCall({
    contract,
    method: "executeProposal",
    params: [BigInt(proposalId)],
  });
}

/**
 * Prepare cancelProposal transaction
 */
export function prepareCancelProposal(proposalId: number) {
  const contract = getGovernanceContract();

  return prepareContractCall({
    contract,
    method: "cancelProposal",
    params: [BigInt(proposalId)],
  });
}

// ============ Helper Functions ============

/**
 * Format time remaining for display
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return "Ended";

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h remaining`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  } else {
    return `${minutes}m remaining`;
  }
}

/**
 * Format proposal for display
 */
export function formatProposalForDisplay(proposal: ProposalData & { id: number }) {
  const now = Date.now() / 1000;
  const endTime = Number(proposal.endTime);
  const startTime = Number(proposal.startTime);
  const isActive = now >= startTime && now < endTime && !proposal.canceled && !proposal.executed;
  const isEnded = now >= endTime;
  const totalVotes = proposal.forVotes + proposal.againstVotes;
  const forPercent = totalVotes > 0 ? Number((proposal.forVotes * BigInt(100)) / totalVotes) : 0;
  const againstPercent = totalVotes > 0 ? Number((proposal.againstVotes * BigInt(100)) / totalVotes) : 0;
  const passed = proposal.forVotes > proposal.againstVotes;

  return {
    ...proposal,
    forVotes: proposal.forVotes.toString(),
    againstVotes: proposal.againstVotes.toString(),
    totalVotes: totalVotes.toString(),
    startTime: new Date(startTime * 1000),
    endTime: new Date(endTime * 1000),
    isActive,
    isEnded,
    forPercent,
    againstPercent,
    passed,
    timeRemaining: isEnded ? 0 : Math.floor(endTime - now),
  };
}
