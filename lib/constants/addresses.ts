// Contract addresses on Mantle Sepolia Testnet

export const CONTRACTS = {
  // MilestoneEscrow contract address (unified escrow with milestone-based fund release)
  // Deploy via: npm run deploy:milestone-sepolia
  MILESTONE_ESCROW: "0x14361d51520528a050ae45E028AFdEDe89Ae7428",

  // GovernanceV2 contract address (governance with milestone proposal support)
  // Deployed after MilestoneEscrow (requires escrow address)
  GOVERNANCE_V2: "0xe43E47b6F542541b86F5CA27dcf4DFBbE84BDDB8",

  // Platform wallet (receives 2% platform fees)
  PLATFORM_WALLET: "0xBf30B87972F7A1e1fA018615d636b2C3c7bcA8Ef",
} as const;

// EquityToken contracts are deployed automatically by MilestoneEscrow
// when createCampaignWithMilestones() is called. No need to pre-define addresses here.

// Network configuration
export const NETWORK = {
  CHAIN_ID: 5003,
  NAME: "Mantle Sepolia Testnet",
  RPC_URL: "https://rpc.sepolia.mantle.xyz",
  EXPLORER_URL: "https://explorer.sepolia.mantle.xyz",
  FAUCET_URL: "https://faucet.sepolia.mantle.xyz",
} as const;

// Campaign configuration (for MVP demo)
export const CAMPAIGN_CONFIG = {
  // Goal in MNT (wei)
  GOAL: BigInt("100000000000000000000"), // 100 MNT

  // Minimum investment in MNT (wei)
  MIN_INVESTMENT: BigInt("1000000000000000000"), // 1 MNT

  // Maximum investment in MNT (wei) - Korean regulation: ~50M KRW
  MAX_INVESTMENT: BigInt("50000000000000000000"), // 50 MNT for demo
} as const;
