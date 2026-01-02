// Contract utilities index
// Unified exports with conflict resolution

// ABIs
export * from "./abis";

// Types (no conflicts)
export * from "./types";

// Governance (no conflicts)
export * from "./governance";

// Unified Escrow (primary source for all campaign operations)
// MilestoneEscrow handles both regular and milestone campaigns
export {
  getEscrowContract,
  getCampaign,
  getCampaignCount,
  getAllCampaigns,
  getCampaignsByCreator,
  getCampaignsByInvestor,
  getPledge,
  isCampaignSuccessful,
  hasClaimedTokens,
  getUnreleasedFunds,
  prepareCreateCampaign,
  prepareCreateCampaignWithMilestones,
  preparePledge,
  prepareUnpledge,
  prepareClaim,
  prepareClaimTokens,
  prepareClaimFounderTokens,
  prepareRefund,
  prepareEmergencyRefund,
  prepareSubmitMilestoneForApproval,
  prepareReleaseMilestoneFunds,
  formatCampaignForDisplay,
  type CampaignData,
} from "./escrow";

// Milestone-specific utilities (unique to milestones.ts)
export {
  getMilestoneEscrowContract,
  getGovernanceV2Contract,
  getMilestoneCampaignCount,
  getAllMilestoneCampaigns,
  getMilestoneCampaignsByCreator,
  getMilestoneCampaignsByInvestor,
  getMilestoneCampaign,
  getMilestone,
  getCampaignMilestones,
  isMilestoneCampaignSuccessful,
  getMilestonePledge,
  getProposalV2,
  getProposalV2Status,
  getVotingResultsV2,
  isMilestoneProposal,
  getMilestoneProposals,
  prepareMilestonePledge,
  prepareMilestoneClaimTokens,
  prepareVoteV2,
  prepareExecuteProposalV2,
  prepareCreateProposalV2,
  getMilestoneProgress,
  canRequestEmergencyRefund,
} from "./milestones";
