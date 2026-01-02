// Contract addresses on Mantle Sepolia Testnet
// TODO: Update CROWDFUNDING_ESCROW after deploying via Thirdweb SDK

export const CONTRACTS = {
  // CrowdfundingEscrow contract address
  // Deploy this contract first, then update this address
  CROWDFUNDING_ESCROW: "0x9a7b596B544294541ffe5fE3e793D2b0fE3F885f",

  // Governance contract address
  // Deployed after CrowdfundingEscrow (requires escrow address)
  GOVERNANCE: "0xAD594DFf154C4d47dA35A180Abc022Ae4dC3Af27",

  // MilestoneEscrow contract address (milestone-based fund release)
  // Deploy via: npm run deploy:milestone-sepolia
  MILESTONE_ESCROW: "0x14361d51520528a050ae45E028AFdEDe89Ae7428",

  // GovernanceV2 contract address (extended governance with milestone proposals)
  // Deployed after MilestoneEscrow (requires escrow address)
  GOVERNANCE_V2: "0xe43E47b6F542541b86F5CA27dcf4DFBbE84BDDB8",

  // Platform wallet (receives 2% platform fees)
  // This should be your wallet address
  PLATFORM_WALLET: "0xBf30B87972F7A1e1fA018615d636b2C3c7bcA8Ef",
} as const;

// EquityToken contracts are deployed automatically by CrowdfundingEscrow
// when createCampaign() is called. No need to pre-define addresses here.

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
