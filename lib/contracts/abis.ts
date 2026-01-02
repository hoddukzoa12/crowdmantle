// Contract ABIs for CrowdMantle
// These match the Solidity contracts in /contracts folder

export const EQUITY_TOKEN_ABI = [
  // ERC20 Standard Functions
  {
    name: "name",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "pure",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "transferFrom",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },

  // Custom Functions
  {
    name: "escrowContract",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "campaignId",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "mint",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },

  // ERC20 Events
  {
    name: "Transfer",
    type: "event",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
  {
    name: "Approval",
    type: "event",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "spender", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
] as const;

// MilestoneEscrow ABI - Unified escrow with milestone-based fund release
export const MILESTONE_ESCROW_ABI = [
  // Read Functions
  {
    name: "campaignCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "platformWallet",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "governanceContract",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "PLATFORM_FEE_BPS",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "MAX_MILESTONES",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getCampaign",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_campaignId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "creator", type: "address" },
          { name: "goal", type: "uint256" },
          { name: "pledged", type: "uint256" },
          { name: "startAt", type: "uint256" },
          { name: "endAt", type: "uint256" },
          { name: "claimed", type: "bool" },
          { name: "equityToken", type: "address" },
          { name: "name", type: "string" },
          { name: "tokenSymbol", type: "string" },
          { name: "founderShareBps", type: "uint256" },
          { name: "founderTokensClaimed", type: "bool" },
          // Milestone-specific fields (order must match Solidity struct)
          { name: "milestoneCount", type: "uint256" },
          { name: "releasedAmount", type: "uint256" },
          { name: "hasMilestones", type: "bool" },
        ],
      },
    ],
  },
  {
    name: "getPledge",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_campaignId", type: "uint256" },
      { name: "_investor", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getMilestone",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_campaignId", type: "uint256" },
      { name: "_milestoneIndex", type: "uint256" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "title", type: "string" },
          { name: "description", type: "string" },
          { name: "percentage", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "status", type: "uint8" },
          { name: "proposalId", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "getCampaignMilestones",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_campaignId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "title", type: "string" },
          { name: "description", type: "string" },
          { name: "percentage", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "status", type: "uint8" },
          { name: "proposalId", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "getUnreleasedFunds",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_campaignId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "isCampaignSuccessful",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_campaignId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "isCampaignEnded",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_campaignId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "getTimeRemaining",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_campaignId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "tokensClaimed",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "campaignId", type: "uint256" },
      { name: "investor", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },

  // Write Functions
  {
    name: "createCampaign",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_goal", type: "uint256" },
      { name: "_durationDays", type: "uint256" },
      { name: "_name", type: "string" },
      { name: "_tokenName", type: "string" },
      { name: "_tokenSymbol", type: "string" },
      { name: "_founderShareBps", type: "uint256" },
    ],
    outputs: [{ name: "campaignId", type: "uint256" }],
  },
  {
    name: "createCampaignWithMilestones",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_goal", type: "uint256" },
      { name: "_durationDays", type: "uint256" },
      { name: "_name", type: "string" },
      { name: "_tokenName", type: "string" },
      { name: "_tokenSymbol", type: "string" },
      { name: "_founderShareBps", type: "uint256" },
      { name: "_milestoneTitles", type: "string[]" },
      { name: "_milestoneDescriptions", type: "string[]" },
      { name: "_milestonePercentages", type: "uint256[]" },
      { name: "_milestoneDaysAfterEnd", type: "uint256[]" },
    ],
    outputs: [{ name: "campaignId", type: "uint256" }],
  },
  {
    name: "pledge",
    type: "function",
    stateMutability: "payable",
    inputs: [{ name: "_campaignId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "unpledge",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_campaignId", type: "uint256" },
      { name: "_amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "claimTokens",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_campaignId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "claimFounderTokens",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_campaignId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "claim",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_campaignId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "refund",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_campaignId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "submitMilestoneForApproval",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_campaignId", type: "uint256" },
      { name: "_milestoneIndex", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "releaseMilestoneFunds",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_campaignId", type: "uint256" },
      { name: "_milestoneIndex", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "emergencyRefund",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_campaignId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "setGovernanceContract",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_governance", type: "address" }],
    outputs: [],
  },
  {
    name: "updateMilestoneStatus",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_campaignId", type: "uint256" },
      { name: "_milestoneIndex", type: "uint256" },
      { name: "_approved", type: "bool" },
    ],
    outputs: [],
  },

  // Events
  {
    name: "CampaignCreated",
    type: "event",
    inputs: [
      { name: "campaignId", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "goal", type: "uint256", indexed: false },
      { name: "startAt", type: "uint256", indexed: false },
      { name: "endAt", type: "uint256", indexed: false },
      { name: "equityToken", type: "address", indexed: false },
      { name: "name", type: "string", indexed: false },
      { name: "tokenSymbol", type: "string", indexed: false },
      { name: "hasMilestones", type: "bool", indexed: false },
    ],
  },
  {
    name: "Pledged",
    type: "event",
    inputs: [
      { name: "campaignId", type: "uint256", indexed: true },
      { name: "investor", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "totalPledged", type: "uint256", indexed: false },
    ],
  },
  {
    name: "Unpledged",
    type: "event",
    inputs: [
      { name: "campaignId", type: "uint256", indexed: true },
      { name: "investor", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "totalPledged", type: "uint256", indexed: false },
    ],
  },
  {
    name: "MilestoneSubmitted",
    type: "event",
    inputs: [
      { name: "campaignId", type: "uint256", indexed: true },
      { name: "milestoneIndex", type: "uint256", indexed: true },
      { name: "proposalId", type: "uint256", indexed: false },
    ],
  },
  {
    name: "MilestoneStatusUpdated",
    type: "event",
    inputs: [
      { name: "campaignId", type: "uint256", indexed: true },
      { name: "milestoneIndex", type: "uint256", indexed: true },
      { name: "status", type: "uint8", indexed: false },
    ],
  },
  {
    name: "MilestoneFundsReleased",
    type: "event",
    inputs: [
      { name: "campaignId", type: "uint256", indexed: true },
      { name: "milestoneIndex", type: "uint256", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "platformFee", type: "uint256", indexed: false },
    ],
  },
  {
    name: "EmergencyRefund",
    type: "event",
    inputs: [
      { name: "campaignId", type: "uint256", indexed: true },
      { name: "investor", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "TokensClaimed",
    type: "event",
    inputs: [
      { name: "campaignId", type: "uint256", indexed: true },
      { name: "investor", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "Refunded",
    type: "event",
    inputs: [
      { name: "campaignId", type: "uint256", indexed: true },
      { name: "investor", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

// GovernanceV2 ABI - Extended governance with milestone proposal support
export const GOVERNANCE_V2_ABI = [
  // Read Functions
  {
    name: "proposalCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "VOTING_PERIOD",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "MIN_PROPOSER_HOLDING_BPS",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "escrow",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "getProposal",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_proposalId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "campaignId", type: "uint256" },
          { name: "proposer", type: "address" },
          { name: "title", type: "string" },
          { name: "description", type: "string" },
          { name: "forVotes", type: "uint256" },
          { name: "againstVotes", type: "uint256" },
          { name: "startTime", type: "uint256" },
          { name: "endTime", type: "uint256" },
          { name: "executed", type: "bool" },
          { name: "canceled", type: "bool" },
          { name: "proposalType", type: "uint8" },
          { name: "milestoneIndex", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "getCampaignProposals",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_campaignId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    name: "getMilestoneProposals",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_campaignId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    name: "getGeneralProposals",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_campaignId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    name: "proposalPassed",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_proposalId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "getProposalStatus",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_proposalId", type: "uint256" }],
    outputs: [{ name: "status", type: "uint8" }],
  },
  {
    name: "getVotingResults",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_proposalId", type: "uint256" }],
    outputs: [
      { name: "forPercent", type: "uint256" },
      { name: "againstPercent", type: "uint256" },
      { name: "totalVotes", type: "uint256" },
    ],
  },
  {
    name: "hasAddressVoted",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_proposalId", type: "uint256" },
      { name: "_voter", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "getVoteWeight",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_proposalId", type: "uint256" },
      { name: "_voter", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getTimeRemaining",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_proposalId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "isMilestoneProposal",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_proposalId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "getMilestoneProposalId",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_campaignId", type: "uint256" },
      { name: "_milestoneIndex", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },

  // Write Functions
  {
    name: "createProposal",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_campaignId", type: "uint256" },
      { name: "_title", type: "string" },
      { name: "_description", type: "string" },
    ],
    outputs: [{ name: "proposalId", type: "uint256" }],
  },
  {
    name: "createMilestoneProposal",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_campaignId", type: "uint256" },
      { name: "_milestoneIndex", type: "uint256" },
      { name: "_title", type: "string" },
      { name: "_description", type: "string" },
    ],
    outputs: [{ name: "proposalId", type: "uint256" }],
  },
  {
    name: "vote",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_proposalId", type: "uint256" },
      { name: "_support", type: "bool" },
    ],
    outputs: [],
  },
  {
    name: "executeProposal",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_proposalId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "cancelProposal",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_proposalId", type: "uint256" }],
    outputs: [],
  },

  // Events
  {
    name: "ProposalCreated",
    type: "event",
    inputs: [
      { name: "proposalId", type: "uint256", indexed: true },
      { name: "campaignId", type: "uint256", indexed: true },
      { name: "proposer", type: "address", indexed: true },
      { name: "title", type: "string", indexed: false },
      { name: "proposalType", type: "uint8", indexed: false },
      { name: "startTime", type: "uint256", indexed: false },
      { name: "endTime", type: "uint256", indexed: false },
    ],
  },
  {
    name: "Voted",
    type: "event",
    inputs: [
      { name: "proposalId", type: "uint256", indexed: true },
      { name: "voter", type: "address", indexed: true },
      { name: "support", type: "bool", indexed: false },
      { name: "weight", type: "uint256", indexed: false },
    ],
  },
  {
    name: "ProposalExecuted",
    type: "event",
    inputs: [
      { name: "proposalId", type: "uint256", indexed: true },
      { name: "passed", type: "bool", indexed: false },
    ],
  },
  {
    name: "MilestoneProposalExecuted",
    type: "event",
    inputs: [
      { name: "proposalId", type: "uint256", indexed: true },
      { name: "campaignId", type: "uint256", indexed: true },
      { name: "milestoneIndex", type: "uint256", indexed: false },
      { name: "approved", type: "bool", indexed: false },
    ],
  },
  {
    name: "ProposalCanceled",
    type: "event",
    inputs: [
      { name: "proposalId", type: "uint256", indexed: true },
    ],
  },
] as const;
