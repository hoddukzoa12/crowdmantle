// MilestoneEscrow contract utilities
// For interacting with the milestone-based escrow contract via Thirdweb SDK

import { getContract, prepareContractCall, readContract } from "thirdweb";
import { mantleSepolia } from "@/lib/thirdweb/chains";
import { client } from "@/lib/thirdweb/client";
import { CONTRACTS } from "@/lib/constants/addresses";
import { MILESTONE_ESCROW_ABI, GOVERNANCE_V2_ABI } from "./abis";
import {
  MilestoneData,
  MilestoneCampaignData,
  MilestoneStatus,
  ProposalV2Data,
  ProposalStatus,
  percentageToBps,
} from "./types";
import { getUnreleasedFunds } from "./escrow";

// Re-export types for external use
export type { MilestoneData, MilestoneCampaignData, ProposalV2Data };
export { MilestoneStatus, ProposalStatus };

// ============================================
// Contract Instances
// ============================================

/**
 * Get MilestoneEscrow contract instance
 */
export function getMilestoneEscrowContract() {
  const address = (CONTRACTS as Record<string, string>).MILESTONE_ESCROW;
  if (!address || address === "0x0000000000000000000000000000000000000000") {
    console.warn("MilestoneEscrow contract address not configured");
    return null;
  }

  return getContract({
    client,
    chain: mantleSepolia,
    address,
    abi: MILESTONE_ESCROW_ABI,
  });
}

/**
 * Get GovernanceV2 contract instance
 */
export function getGovernanceV2Contract() {
  const address = (CONTRACTS as Record<string, string>).GOVERNANCE_V2;
  if (!address || address === "0x0000000000000000000000000000000000000000") {
    console.warn("GovernanceV2 contract address not configured");
    return null;
  }

  return getContract({
    client,
    chain: mantleSepolia,
    address,
    abi: GOVERNANCE_V2_ABI,
  });
}

// ============================================
// Read Functions - MilestoneEscrow
// ============================================

/**
 * Get campaign count from MilestoneEscrow
 */
export async function getMilestoneCampaignCount(): Promise<number> {
  const contract = getMilestoneEscrowContract();
  if (!contract) return 0;

  try {
    const count = await readContract({
      contract,
      method: "campaignCount",
      params: [],
    });
    return Number(count);
  } catch (error) {
    console.error("Error fetching milestone campaign count:", error);
    return 0;
  }
}

type MilestoneCampaignWithId = MilestoneCampaignData & { id: number; isMilestone: true };

/**
 * Get all campaigns from MilestoneEscrow
 */
export async function getAllMilestoneCampaigns(): Promise<MilestoneCampaignWithId[]> {
  const count = await getMilestoneCampaignCount();
  if (count === 0) return [];

  const campaigns: MilestoneCampaignWithId[] = [];
  for (let i = 0; i < count; i++) {
    const campaign = await getMilestoneCampaign(i);
    if (campaign) {
      campaigns.push({ ...campaign, id: i, isMilestone: true });
    }
  }
  return campaigns;
}

/**
 * Get milestone campaigns created by a specific address
 */
export async function getMilestoneCampaignsByCreator(
  creatorAddress: string
): Promise<MilestoneCampaignWithId[]> {
  const allCampaigns = await getAllMilestoneCampaigns();
  return allCampaigns.filter(
    (c) => c.creator.toLowerCase() === creatorAddress.toLowerCase()
  );
}

/**
 * Get milestone campaigns where user has invested
 */
export async function getMilestoneCampaignsByInvestor(
  investorAddress: string
): Promise<(MilestoneCampaignWithId & { pledgeAmount: bigint })[]> {
  const allCampaigns = await getAllMilestoneCampaigns();
  const result: (MilestoneCampaignWithId & { pledgeAmount: bigint })[] = [];

  for (const campaign of allCampaigns) {
    const pledge = await getMilestonePledge(campaign.id, investorAddress);
    if (pledge > BigInt(0)) {
      result.push({ ...campaign, pledgeAmount: pledge });
    }
  }
  return result;
}

/**
 * Get campaign data with milestone info
 */
export async function getMilestoneCampaign(
  campaignId: number
): Promise<MilestoneCampaignData | null> {
  const contract = getMilestoneEscrowContract();
  if (!contract) return null;

  try {
    const campaign = await readContract({
      contract,
      method: "getCampaign",
      params: [BigInt(campaignId)],
    });
    return campaign as unknown as MilestoneCampaignData;
  } catch (error) {
    console.error("Error fetching milestone campaign:", error);
    return null;
  }
}

/**
 * Get single milestone data
 */
export async function getMilestone(
  campaignId: number,
  milestoneIndex: number
): Promise<MilestoneData | null> {
  const contract = getMilestoneEscrowContract();
  if (!contract) return null;

  try {
    const milestone = await readContract({
      contract,
      method: "getMilestone",
      params: [BigInt(campaignId), BigInt(milestoneIndex)],
    });
    return milestone as unknown as MilestoneData;
  } catch (error) {
    console.error("Error fetching milestone:", error);
    return null;
  }
}

/**
 * Get all milestones for a campaign
 */
export async function getCampaignMilestones(
  campaignId: number
): Promise<MilestoneData[]> {
  const contract = getMilestoneEscrowContract();
  if (!contract) return [];

  try {
    const milestones = await readContract({
      contract,
      method: "getCampaignMilestones",
      params: [BigInt(campaignId)],
    });
    return milestones as unknown as MilestoneData[];
  } catch (error) {
    console.error("Error fetching campaign milestones:", error);
    return [];
  }
}

// Note: getUnreleasedFunds is now in escrow.ts (unified contract)

/**
 * Check if campaign is successful
 */
export async function isMilestoneCampaignSuccessful(
  campaignId: number
): Promise<boolean> {
  const contract = getMilestoneEscrowContract();
  if (!contract) return false;

  try {
    const result = await readContract({
      contract,
      method: "isCampaignSuccessful",
      params: [BigInt(campaignId)],
    });
    return result as boolean;
  } catch (error) {
    console.error("Error checking campaign success:", error);
    return false;
  }
}

/**
 * Get pledge amount for an investor
 */
export async function getMilestonePledge(
  campaignId: number,
  investor: string
): Promise<bigint> {
  const contract = getMilestoneEscrowContract();
  if (!contract) return BigInt(0);

  try {
    const pledge = await readContract({
      contract,
      method: "getPledge",
      params: [BigInt(campaignId), investor],
    });
    return pledge as bigint;
  } catch (error) {
    console.error("Error fetching pledge:", error);
    return BigInt(0);
  }
}

// ============================================
// Read Functions - GovernanceV2
// ============================================

/**
 * Get proposal data from GovernanceV2
 */
export async function getProposalV2(
  proposalId: number
): Promise<ProposalV2Data | null> {
  const contract = getGovernanceV2Contract();
  if (!contract) return null;

  try {
    const proposal = await readContract({
      contract,
      method: "getProposal",
      params: [BigInt(proposalId)],
    });
    return proposal as unknown as ProposalV2Data;
  } catch (error) {
    console.error("Error fetching proposal:", error);
    return null;
  }
}

/**
 * Get proposal status
 */
export async function getProposalV2Status(
  proposalId: number
): Promise<ProposalStatus> {
  const contract = getGovernanceV2Contract();
  if (!contract) return ProposalStatus.Pending;

  try {
    const status = await readContract({
      contract,
      method: "getProposalStatus",
      params: [BigInt(proposalId)],
    });
    return status as ProposalStatus;
  } catch (error) {
    console.error("Error fetching proposal status:", error);
    return ProposalStatus.Pending;
  }
}

/**
 * Get voting results for a proposal
 */
export async function getVotingResultsV2(proposalId: number): Promise<{
  forPercent: bigint;
  againstPercent: bigint;
  totalVotes: bigint;
}> {
  const contract = getGovernanceV2Contract();
  if (!contract) {
    return { forPercent: BigInt(0), againstPercent: BigInt(0), totalVotes: BigInt(0) };
  }

  try {
    const result = await readContract({
      contract,
      method: "getVotingResults",
      params: [BigInt(proposalId)],
    });
    const [forPercent, againstPercent, totalVotes] = result as [
      bigint,
      bigint,
      bigint
    ];
    return { forPercent, againstPercent, totalVotes };
  } catch (error) {
    console.error("Error fetching voting results:", error);
    return { forPercent: BigInt(0), againstPercent: BigInt(0), totalVotes: BigInt(0) };
  }
}

/**
 * Check if milestone proposal
 */
export async function isMilestoneProposal(proposalId: number): Promise<boolean> {
  const contract = getGovernanceV2Contract();
  if (!contract) return false;

  try {
    const result = await readContract({
      contract,
      method: "isMilestoneProposal",
      params: [BigInt(proposalId)],
    });
    return result as boolean;
  } catch (error) {
    console.error("Error checking milestone proposal:", error);
    return false;
  }
}

/**
 * Get milestone proposals for a campaign
 */
export async function getMilestoneProposals(
  campaignId: number
): Promise<bigint[]> {
  const contract = getGovernanceV2Contract();
  if (!contract) return [];

  try {
    const proposals = await readContract({
      contract,
      method: "getMilestoneProposals",
      params: [BigInt(campaignId)],
    });
    return proposals as bigint[];
  } catch (error) {
    console.error("Error fetching milestone proposals:", error);
    return [];
  }
}

// ============================================
// Write Functions - MilestoneEscrow
// ============================================

/**
 * Prepare create campaign with milestones transaction
 */
export function prepareCreateCampaignWithMilestones(
  goal: bigint,
  durationDays: number,
  name: string,
  tokenName: string,
  tokenSymbol: string,
  founderShareBps: number,
  milestoneTitles: string[],
  milestoneDescriptions: string[],
  milestonePercentages: number[], // 0-100
  milestoneDaysAfterEnd: number[]
) {
  const contract = getMilestoneEscrowContract();
  if (!contract) {
    throw new Error("MilestoneEscrow contract not configured");
  }

  return prepareContractCall({
    contract,
    method: "createCampaignWithMilestones",
    params: [
      goal,
      BigInt(durationDays),
      name,
      tokenName,
      tokenSymbol,
      BigInt(founderShareBps),
      milestoneTitles,
      milestoneDescriptions,
      milestonePercentages.map((p) => percentageToBps(p)),
      milestoneDaysAfterEnd.map((d) => BigInt(d)),
    ],
  });
}

/**
 * Prepare pledge transaction
 */
export function prepareMilestonePledge(campaignId: number, value: bigint) {
  const contract = getMilestoneEscrowContract();
  if (!contract) {
    throw new Error("MilestoneEscrow contract not configured");
  }

  return prepareContractCall({
    contract,
    method: "pledge",
    params: [BigInt(campaignId)],
    value,
  });
}

/**
 * Prepare submit milestone for approval transaction
 */
export function prepareSubmitMilestoneForApproval(
  campaignId: number,
  milestoneIndex: number
) {
  const contract = getMilestoneEscrowContract();
  if (!contract) {
    throw new Error("MilestoneEscrow contract not configured");
  }

  return prepareContractCall({
    contract,
    method: "submitMilestoneForApproval",
    params: [BigInt(campaignId), BigInt(milestoneIndex)],
  });
}

/**
 * Prepare release milestone funds transaction
 */
export function prepareReleaseMilestoneFunds(
  campaignId: number,
  milestoneIndex: number
) {
  const contract = getMilestoneEscrowContract();
  if (!contract) {
    throw new Error("MilestoneEscrow contract not configured");
  }

  return prepareContractCall({
    contract,
    method: "releaseMilestoneFunds",
    params: [BigInt(campaignId), BigInt(milestoneIndex)],
  });
}

/**
 * Prepare emergency refund transaction
 */
export function prepareEmergencyRefund(campaignId: number) {
  const contract = getMilestoneEscrowContract();
  if (!contract) {
    throw new Error("MilestoneEscrow contract not configured");
  }

  return prepareContractCall({
    contract,
    method: "emergencyRefund",
    params: [BigInt(campaignId)],
  });
}

/**
 * Prepare claim tokens transaction
 */
export function prepareMilestoneClaimTokens(campaignId: number) {
  const contract = getMilestoneEscrowContract();
  if (!contract) {
    throw new Error("MilestoneEscrow contract not configured");
  }

  return prepareContractCall({
    contract,
    method: "claimTokens",
    params: [BigInt(campaignId)],
  });
}

// ============================================
// Write Functions - GovernanceV2
// ============================================

/**
 * Prepare vote transaction
 */
export function prepareVoteV2(proposalId: number, support: boolean) {
  const contract = getGovernanceV2Contract();
  if (!contract) {
    throw new Error("GovernanceV2 contract not configured");
  }

  return prepareContractCall({
    contract,
    method: "vote",
    params: [BigInt(proposalId), support],
  });
}

/**
 * Prepare execute proposal transaction
 */
export function prepareExecuteProposalV2(proposalId: number) {
  const contract = getGovernanceV2Contract();
  if (!contract) {
    throw new Error("GovernanceV2 contract not configured");
  }

  return prepareContractCall({
    contract,
    method: "executeProposal",
    params: [BigInt(proposalId)],
  });
}

/**
 * Prepare create general proposal transaction
 */
export function prepareCreateProposalV2(
  campaignId: number,
  title: string,
  description: string
) {
  const contract = getGovernanceV2Contract();
  if (!contract) {
    throw new Error("GovernanceV2 contract not configured");
  }

  return prepareContractCall({
    contract,
    method: "createProposal",
    params: [BigInt(campaignId), title, description],
  });
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get milestone progress summary for a campaign
 */
export async function getMilestoneProgress(campaignId: number): Promise<{
  total: number;
  released: number;
  releasedAmount: bigint;
  unreleasedAmount: bigint;
  nextPendingIndex: number;
}> {
  const campaign = await getMilestoneCampaign(campaignId);
  if (!campaign || !campaign.hasMilestones) {
    return {
      total: 0,
      released: 0,
      releasedAmount: BigInt(0),
      unreleasedAmount: BigInt(0),
      nextPendingIndex: -1,
    };
  }

  const milestones = await getCampaignMilestones(campaignId);
  let released = 0;
  let nextPendingIndex = -1;

  for (let i = 0; i < milestones.length; i++) {
    if (milestones[i].status === MilestoneStatus.Released) {
      released++;
    } else if (nextPendingIndex === -1 && milestones[i].status === MilestoneStatus.Pending) {
      nextPendingIndex = i;
    }
  }

  const unreleasedAmount = await getUnreleasedFunds(campaignId);

  return {
    total: milestones.length,
    released,
    releasedAmount: campaign.releasedAmount,
    unreleasedAmount,
    nextPendingIndex,
  };
}

/**
 * Check if investor can request emergency refund
 */
export async function canRequestEmergencyRefund(
  campaignId: number
): Promise<boolean> {
  const milestones = await getCampaignMilestones(campaignId);

  // Emergency refund allowed if any milestone is rejected
  return milestones.some((m) => m.status === MilestoneStatus.Rejected);
}
