// Unified Escrow contract utilities (using MilestoneEscrow)
// Supports both regular campaigns and milestone-based campaigns via single contract

import { getContract, prepareContractCall, readContract } from "thirdweb";
import { mantleSepolia } from "@/lib/thirdweb/chains";
import { client } from "@/lib/thirdweb/client";
import { CONTRACTS } from "@/lib/constants/addresses";
import { MILESTONE_ESCROW_ABI } from "./abis";

// Check if escrow contract is configured
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Contract instance (uses MilestoneEscrow which supports both regular and milestone campaigns)
export function getEscrowContract() {
  const address = (CONTRACTS as Record<string, string>).MILESTONE_ESCROW;
  if (!address || address === ZERO_ADDRESS) {
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

// Type definitions for campaign data (unified structure)
export interface CampaignData {
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
  // Milestone-specific fields (always present in unified contract)
  milestoneCount: bigint;
  releasedAmount: bigint;
  hasMilestones: boolean;
}

// ============ Read Functions ============

/**
 * Get campaign details by ID
 */
export async function getCampaign(campaignId: number): Promise<CampaignData | null> {
  const contract = getEscrowContract();
  if (!contract) return null;

  try {
    const result = await readContract({
      contract,
      method: "getCampaign",
      params: [BigInt(campaignId)],
    });
    return result as unknown as CampaignData;
  } catch (error) {
    console.error("Error reading campaign:", error);
    return null;
  }
}

/**
 * Get total number of campaigns
 */
export async function getCampaignCount(): Promise<number> {
  const contract = getEscrowContract();
  if (!contract) return 0;

  try {
    const result = await readContract({
      contract,
      method: "campaignCount",
      params: [],
    });
    return Number(result);
  } catch (error) {
    console.error("Error reading campaign count:", error);
    return 0;
  }
}

/**
 * Get all campaigns
 */
export async function getAllCampaigns(): Promise<(CampaignData & { id: number })[]> {
  const count = await getCampaignCount();
  if (count === 0) return [];

  const campaigns: (CampaignData & { id: number })[] = [];

  for (let i = 0; i < count; i++) {
    const campaign = await getCampaign(i);
    if (campaign) {
      campaigns.push({ ...campaign, id: i });
    }
  }

  return campaigns;
}

/**
 * Get campaigns created by a specific address
 */
export async function getCampaignsByCreator(creatorAddress: string): Promise<(CampaignData & { id: number })[]> {
  const allCampaigns = await getAllCampaigns();
  return allCampaigns.filter(
    campaign => campaign.creator.toLowerCase() === creatorAddress.toLowerCase()
  );
}

/**
 * Get campaigns that a user has pledged to
 */
export async function getCampaignsByInvestor(investorAddress: string): Promise<(CampaignData & { id: number; pledgeAmount: bigint })[]> {
  const allCampaigns = await getAllCampaigns();
  const investedCampaigns: (CampaignData & { id: number; pledgeAmount: bigint })[] = [];

  for (const campaign of allCampaigns) {
    const pledgeAmount = await getPledge(campaign.id, investorAddress);
    if (pledgeAmount > BigInt(0)) {
      investedCampaigns.push({ ...campaign, pledgeAmount });
    }
  }

  return investedCampaigns;
}

/**
 * Get pledge amount for an investor
 */
export async function getPledge(campaignId: number, investor: string): Promise<bigint> {
  const contract = getEscrowContract();
  if (!contract) return BigInt(0);

  try {
    const result = await readContract({
      contract,
      method: "getPledge",
      params: [BigInt(campaignId), investor],
    });
    return result as bigint;
  } catch (error) {
    console.error("Error reading pledge:", error);
    return BigInt(0);
  }
}

/**
 * Check if campaign was successful
 */
export async function isCampaignSuccessful(campaignId: number): Promise<boolean> {
  const contract = getEscrowContract();
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
 * Check if investor has claimed tokens
 */
export async function hasClaimedTokens(campaignId: number, investor: string): Promise<boolean> {
  const contract = getEscrowContract();
  if (!contract) return false;

  try {
    const result = await readContract({
      contract,
      method: "tokensClaimed",
      params: [BigInt(campaignId), investor],
    });
    return result as boolean;
  } catch (error) {
    console.error("Error checking token claim status:", error);
    return false;
  }
}

/**
 * Get unreleased funds for a campaign
 */
export async function getUnreleasedFunds(campaignId: number): Promise<bigint> {
  const contract = getEscrowContract();
  if (!contract) return BigInt(0);

  try {
    const result = await readContract({
      contract,
      method: "getUnreleasedFunds",
      params: [BigInt(campaignId)],
    });
    return result as bigint;
  } catch (error) {
    console.error("Error getting unreleased funds:", error);
    return BigInt(0);
  }
}

// ============ Write Function Preparations ============

/**
 * Prepare createCampaign transaction (regular, non-milestone)
 */
export function prepareCreateCampaign(
  goal: bigint,
  durationDays: number,
  name: string,
  tokenName: string,
  tokenSymbol: string,
  founderShareBps: number
) {
  const contract = getEscrowContract();
  if (!contract) throw new Error("Contract not configured");

  return prepareContractCall({
    contract,
    method: "createCampaign",
    params: [goal, BigInt(durationDays), name, tokenName, tokenSymbol, BigInt(founderShareBps)],
  });
}

/**
 * Prepare createCampaignWithMilestones transaction
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
  milestonePercentages: bigint[],
  milestoneDaysAfterEnd: bigint[]
) {
  const contract = getEscrowContract();
  if (!contract) throw new Error("Contract not configured");

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
      milestonePercentages,
      milestoneDaysAfterEnd,
    ],
  });
}

/**
 * Prepare pledge transaction
 */
export function preparePledge(campaignId: number, amount: bigint) {
  const contract = getEscrowContract();
  if (!contract) throw new Error("Contract not configured");

  return prepareContractCall({
    contract,
    method: "pledge",
    params: [BigInt(campaignId)],
    value: amount,
  });
}

/**
 * Prepare unpledge transaction
 */
export function prepareUnpledge(campaignId: number, amount: bigint) {
  const contract = getEscrowContract();
  if (!contract) throw new Error("Contract not configured");

  return prepareContractCall({
    contract,
    method: "unpledge",
    params: [BigInt(campaignId), amount],
  });
}

/**
 * Prepare claim transaction (for non-milestone campaign creator)
 */
export function prepareClaim(campaignId: number) {
  const contract = getEscrowContract();
  if (!contract) throw new Error("Contract not configured");

  return prepareContractCall({
    contract,
    method: "claim",
    params: [BigInt(campaignId)],
  });
}

/**
 * Prepare claimTokens transaction (for investors)
 */
export function prepareClaimTokens(campaignId: number) {
  const contract = getEscrowContract();
  if (!contract) throw new Error("Contract not configured");

  return prepareContractCall({
    contract,
    method: "claimTokens",
    params: [BigInt(campaignId)],
  });
}

/**
 * Prepare claimFounderTokens transaction (for campaign creator)
 */
export function prepareClaimFounderTokens(campaignId: number) {
  const contract = getEscrowContract();
  if (!contract) throw new Error("Contract not configured");

  return prepareContractCall({
    contract,
    method: "claimFounderTokens",
    params: [BigInt(campaignId)],
  });
}

/**
 * Prepare refund transaction
 */
export function prepareRefund(campaignId: number) {
  const contract = getEscrowContract();
  if (!contract) throw new Error("Contract not configured");

  return prepareContractCall({
    contract,
    method: "refund",
    params: [BigInt(campaignId)],
  });
}

/**
 * Prepare emergency refund transaction (for milestone campaigns with rejected milestones)
 */
export function prepareEmergencyRefund(campaignId: number) {
  const contract = getEscrowContract();
  if (!contract) throw new Error("Contract not configured");

  return prepareContractCall({
    contract,
    method: "emergencyRefund",
    params: [BigInt(campaignId)],
  });
}

/**
 * Prepare submitMilestoneForApproval transaction
 */
export function prepareSubmitMilestoneForApproval(campaignId: number, milestoneIndex: number) {
  const contract = getEscrowContract();
  if (!contract) throw new Error("Contract not configured");

  return prepareContractCall({
    contract,
    method: "submitMilestoneForApproval",
    params: [BigInt(campaignId), BigInt(milestoneIndex)],
  });
}

/**
 * Prepare releaseMilestoneFunds transaction
 */
export function prepareReleaseMilestoneFunds(campaignId: number, milestoneIndex: number) {
  const contract = getEscrowContract();
  if (!contract) throw new Error("Contract not configured");

  return prepareContractCall({
    contract,
    method: "releaseMilestoneFunds",
    params: [BigInt(campaignId), BigInt(milestoneIndex)],
  });
}

// ============ Helper Functions ============

/**
 * Convert campaign data to frontend-friendly format
 */
export function formatCampaignForDisplay(campaign: CampaignData) {
  const now = Date.now() / 1000;
  const endAt = Number(campaign.endAt);
  const isEnded = now >= endAt;
  const isSuccessful = isEnded && campaign.pledged >= campaign.goal;
  const progress = campaign.goal > 0
    ? Number((campaign.pledged * BigInt(100)) / campaign.goal)
    : 0;

  return {
    ...campaign,
    goal: campaign.goal.toString(),
    pledged: campaign.pledged.toString(),
    startAt: new Date(Number(campaign.startAt) * 1000),
    endAt: new Date(endAt * 1000),
    isEnded,
    isSuccessful,
    progress: Math.min(progress, 100),
    daysRemaining: isEnded ? 0 : Math.ceil((endAt - now) / 86400),
    hasMilestones: campaign.hasMilestones,
    milestoneCount: Number(campaign.milestoneCount),
  };
}
