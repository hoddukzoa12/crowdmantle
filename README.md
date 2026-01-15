# CrowdMantle

<div align="center">

**Decentralized Equity Crowdfunding with Milestone-Based Fund Release**

*Mantle Global Hackathon 2025*

[![Mantle Network](https://img.shields.io/badge/Network-Mantle%20Sepolia-blue)](https://sepolia.mantlescan.xyz)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636)](https://soliditylang.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

</div>

---

## Problem Statement

Traditional crowdfunding platforms suffer from a critical issue: **once a campaign succeeds, creators receive 100% of funds immediately**, leaving investors with no leverage to ensure project delivery.

**CrowdMantle solves this** by implementing milestone-based fund release with on-chain governance, ensuring:
- Creators must deliver promised milestones to access funds
- Investors retain voting power throughout the project lifecycle
- Transparent, trustless fund management via smart contracts

---

## How It Works

```
Traditional Crowdfunding:
Campaign Success → Creator Claims 100% → Investors Hope for Delivery

CrowdMantle Approach:
Campaign Success → Milestone 1 Submitted → Investors Vote → Approved? → 30% Released
                → Milestone 2 Submitted → Investors Vote → Approved? → 40% Released
                → Milestone 3 Submitted → Investors Vote → Approved? → 30% Released
```

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Milestone-Gated Release** | Up to 3 milestones with customizable fund allocation |
| **On-Chain Governance** | Token-weighted voting for milestone approval |
| **Equity Tokens** | ERC-20 tokens issued 1:1 with MNT invested |
| **Investor Protection** | Emergency refund if milestones fail |
| **Automatic Escrow** | Funds held securely until governance approval |
| **Founder Allocation** | Up to 30% founder token share |
| **Platform Fee** | 2% fee on released funds |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, React 19, TypeScript |
| **Styling** | Tailwind CSS 4, Shadcn/ui |
| **Web3** | Thirdweb SDK v5 |
| **Smart Contracts** | Solidity 0.8.20, Hardhat, OpenZeppelin |
| **Network** | Mantle Sepolia Testnet (Chain ID: 5003) |

---

## Smart Contracts

### Deployed Addresses (Mantle Sepolia)

| Contract | Address | Description |
|----------|---------|-------------|
| **MilestoneEscrow** | `0x14361d51520528a050ae45E028AFdEDe89Ae7428` | Unified escrow with milestone support |
| **GovernanceV2** | `0xe43E47b6F542541b86F5CA27dcf4DFBbE84BDDB8` | Extended governance for milestones |
| **Platform Wallet** | `0xBf30B87972F7A1e1fA018615d636b2C3c7bcA8Ef` | Fee recipient |

### Contract Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MilestoneEscrow                               │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐ │
│  │  Campaign    │  │  Milestone   │  │  EquityToken               │ │
│  │  Management  │  │  Tracking    │  │  (deployed per campaign)   │ │
│  │              │  │              │  │                            │ │
│  │  • create    │  │  • submit    │  │  • 1:1 with MNT           │ │
│  │  • pledge    │  │  • approve   │  │  • 18 decimals            │ │
│  │  • refund    │  │  • release   │  │  • governance voting      │ │
│  └──────────────┘  └──────────────┘  └────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                │ milestone proposals
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          GovernanceV2                                │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐ │
│  │  Proposals   │  │  Voting      │  │  Milestone Integration     │ │
│  │              │  │              │  │                            │ │
│  │  • create    │  │  • for/against│ │  • auto-approve on pass   │ │
│  │  • execute   │  │  • 3-day period│ │  • auto-reject on fail   │ │
│  │  • cancel    │  │  • weighted  │  │  • fund release trigger   │ │
│  └──────────────┘  └──────────────┘  └────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### MilestoneEscrow.sol

**Key Functions:**

| Function | Description |
|----------|-------------|
| `createCampaignWithMilestones()` | Create campaign with up to 3 milestones |
| `createCampaign()` | Create standard campaign (immediate claim) |
| `pledge()` | Invest MNT in a campaign |
| `submitMilestoneForApproval()` | Submit milestone for governance vote |
| `releaseMilestoneFunds()` | Release funds after vote approval |
| `claimTokens()` | Investors claim equity tokens |
| `refund()` | Full refund if campaign fails |
| `emergencyRefund()` | Refund if milestone rejected |

**Constants:**

| Constant | Value | Description |
|----------|-------|-------------|
| `PLATFORM_FEE_BPS` | 200 | 2% platform fee |
| `MAX_MILESTONES` | 3 | Maximum milestones per campaign |
| `MAX_FOUNDER_SHARE_BPS` | 3000 | 30% max founder allocation |
| `MIN_DURATION_DAYS` | 1 | Minimum campaign duration |
| `MAX_DURATION_DAYS` | 60 | Maximum campaign duration |

### GovernanceV2.sol

**Key Functions:**

| Function | Description |
|----------|-------------|
| `createMilestoneProposal()` | Create proposal for milestone approval |
| `vote()` | Cast token-weighted vote |
| `executeProposal()` | Finalize after voting period |
| `getProposal()` | Get proposal details |

**Voting Parameters:**
- Voting Period: 3 days
- Minimum Proposer Holding: 1% of token supply
- Quorum: Simple majority

---

## Project Structure

```
crowdmantle/
├── app/                              # Next.js App Router
│   ├── page.tsx                      # Landing page
│   ├── campaign/[id]/                # Campaign detail (unified)
│   ├── dashboard/                    # User dashboard
│   ├── project/create/               # Campaign creation
│   └── projects/                     # Browse campaigns
│
├── components/
│   ├── milestones/                   # Milestone components
│   │   ├── milestone-card.tsx        # Individual milestone
│   │   ├── milestone-progress-card.tsx # Progress timeline
│   │   ├── milestone-tab.tsx         # Campaign milestones tab
│   │   └── milestone-form-step.tsx   # Creation form step
│   ├── governance/                   # Governance components
│   │   ├── governance-tab.tsx        # Governance container
│   │   ├── proposal-list.tsx         # Proposal listing
│   │   ├── proposal-card.tsx         # Proposal display
│   │   ├── create-proposal-dialog.tsx
│   │   └── vote-buttons.tsx
│   ├── crowdfunding/                 # Crowdfunding components
│   ├── project/                      # Project components
│   ├── ui/                           # Shadcn/ui components
│   └── layout/                       # Layout components
│
├── contracts/                        # Solidity contracts
│   ├── MilestoneEscrow.sol          # Main escrow contract
│   ├── GovernanceV2.sol             # Extended governance
│   ├── EquityToken.sol              # ERC-20 token
│   └── interfaces/
│
├── lib/
│   ├── contracts/                    # Contract utilities
│   │   ├── abis.ts                  # Contract ABIs
│   │   ├── escrow.ts                # Escrow interactions
│   │   ├── milestones.ts            # Milestone utilities
│   │   ├── governance.ts            # Governance interactions
│   │   └── types.ts                 # TypeScript types
│   ├── constants/                    # Configuration
│   │   └── addresses.ts             # Contract addresses
│   └── thirdweb/                    # Thirdweb config
│
├── src/                             # Clean architecture layers
│   ├── application/                 # Use cases & DTOs
│   ├── infrastructure/              # Blockchain contracts
│   └── presentation/                # React hooks
│
├── test/                            # Contract tests
│   ├── MilestoneEscrow.test.ts
│   └── GovernanceV2.test.ts
│
└── scripts/                         # Deployment scripts
    ├── deploy.ts
    └── deploy-milestone.ts
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- MetaMask or compatible wallet
- MNT on Mantle Sepolia ([Faucet](https://faucet.sepolia.mantle.xyz))

### Installation

```bash
# Clone repository
git clone <repository>
cd crowdmantle

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Add NEXT_PUBLIC_THIRDWEB_CLIENT_ID
```

### Development

```bash
# Start development server
npm run dev

# Compile contracts
npm run compile

# Run tests
npm run test                    # All tests
npm run test:milestone          # Milestone tests only
npm run test:governance         # Governance tests only

# Deploy contracts
npm run deploy:milestone-sepolia
```

### Build

```bash
npm run build
npm start
```

---

## Environment Variables

```env
# .env.local (Frontend)
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id

# .env (Hardhat)
PRIVATE_KEY=your_wallet_private_key
PLATFORM_WALLET=platform_fee_recipient_address
```

---

## User Flows

### Creator Flow (Milestone Campaign)

```
1. Connect Wallet
         ↓
2. Create Campaign with Milestones
   • Set funding goal & duration
   • Define up to 3 milestones
   • Set percentage allocation per milestone
         ↓
3. Wait for Funding
         ↓
4. Campaign Succeeds (goal reached)
         ↓
5. Submit Milestone 1 for Approval
         ↓
6. Token Holders Vote (3 days)
         ↓
7. If Approved → Claim 30% (minus 2% fee)
         ↓
8. Repeat for Milestones 2 & 3
```

### Investor Flow

```
1. Connect Wallet
         ↓
2. Browse Active Campaigns
         ↓
3. Pledge MNT
         ↓
4. Wait for Campaign End
         ↓
5. If Successful:
   • Claim equity tokens
   • Vote on milestone proposals
   • Monitor fund releases
         ↓
6. If Failed:
   • Claim full refund (100%)
```

### Governance Flow

```
1. Own equity tokens from campaign
         ↓
2. Creator submits milestone
         ↓
3. Vote on milestone proposal
   • For: Approve milestone
   • Against: Reject milestone
         ↓
4. After 3 days:
   • Majority For → Funds released
   • Majority Against → Milestone rejected
         ↓
5. If all milestones rejected → Emergency refund available
```

---

## API Reference

### Campaign Data Structure

```typescript
interface Campaign {
  creator: string;           // Creator address
  goal: bigint;              // Funding goal (wei)
  pledged: bigint;           // Current pledged (wei)
  startAt: bigint;           // Start timestamp
  endAt: bigint;             // End timestamp
  claimed: boolean;          // Funds claimed (non-milestone)
  equityToken: string;       // Token contract address
  name: string;              // Campaign name
  tokenSymbol: string;       // Token symbol
  founderShareBps: bigint;   // Founder share (basis points)
  founderTokensClaimed: boolean;
  milestoneCount: bigint;    // Number of milestones
  releasedAmount: bigint;    // Total released (wei)
  hasMilestones: boolean;    // Is milestone campaign?
}
```

### Milestone Data Structure

```typescript
enum MilestoneStatus {
  Pending = 0,    // Not yet submitted
  Voting = 1,     // Vote in progress
  Approved = 2,   // Vote passed
  Rejected = 3,   // Vote failed
  Released = 4,   // Funds released
}

interface Milestone {
  title: string;
  description: string;
  percentage: bigint;     // Basis points (3000 = 30%)
  deadline: bigint;       // Unix timestamp
  status: MilestoneStatus;
  proposalId: bigint;     // Linked governance proposal
}
```

---

## Security

- **ReentrancyGuard**: All fund transfers protected
- **Checks-Effects-Interactions**: State updated before external calls
- **Access Control**: Role-based restrictions on sensitive functions
- **Escrow Pattern**: Funds held until governance approval
- **No Direct Transfers**: `receive()` function rejects direct MNT
- **Sequential Milestones**: Must complete in order (1 → 2 → 3)

---

## Network Information

| Property | Value |
|----------|-------|
| Network | Mantle Sepolia Testnet |
| Chain ID | 5003 |
| RPC URL | https://rpc.sepolia.mantle.xyz |
| Explorer | https://sepolia.mantlescan.xyz |
| Faucet | https://faucet.sepolia.mantle.xyz |
| Native Token | MNT |

---

## Testing

```bash
# Run all 40 contract tests
npm run test

# Expected output:
# MilestoneEscrow - 26 passing
# GovernanceV2 - 14 passing
```

---

## Roadmap

| Phase | Timeline | Features |
|-------|----------|----------|
| **Core Enhancement** | Q1 2025 | Mainnet deployment, Stablecoin support (USDT/USDC), Project whitepaper |
| **Compliance & Trust** | Q2 2025 | KYC integration, Creator verification, Accredited investor tier |
| **Trading Ecosystem** | Q3-Q4 2025 | Secondary market for tokens, Bybit partnership, xStock listing |
| **Scale & Expand** | 2026 | Cross-chain support, Mobile app, Platform DAO |

### Revenue Model

| Stream | Description |
|--------|-------------|
| Platform Fee | 2% on released funds (currently implemented) |
| Premium Features | Creator analytics, campaign promotion |
| KYC Services | Identity verification fees |
| Trading Fees | Secondary market transaction fees |

---

## Team

| Name | Role | Contact |
|------|------|---------|
| **hoddukzoa** | Full-stack Developer | [GitHub](https://github.com/hoddukzoa12) |
| **Drakos** | Project Manager | [GitHub](https://github.com/superjin1218) |


---

## Compliance Declaration

This project does not involve regulated securities or financial assets. Equity tokens issued are governance tokens for voting purposes only and do not represent ownership or profit-sharing rights in any legal entity. Deployed on Mantle Sepolia Testnet for demonstration purposes.

---

## License

MIT License

---

## Acknowledgments

- [Mantle Network](https://mantle.xyz) - L2 scaling solution
- [Thirdweb](https://thirdweb.com) - Web3 development framework
- [OpenZeppelin](https://openzeppelin.com) - Smart contract security
- [Shadcn/ui](https://ui.shadcn.com) - UI components
