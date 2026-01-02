// Mock campaign data for MVP demo
// In production, this would come from smart contracts or database

export interface Campaign {
  id: string;
  title: string;
  description: string;
  longDescription: string;
  imageUrl: string;
  targetAmount: bigint; // in wei
  raisedAmount: bigint; // in wei
  investorCount: number;
  deadline: Date;
  status: "active" | "funded" | "expired" | "refunding";
  category: "real-estate" | "infrastructure" | "energy" | "other";
  location: string;
  expectedReturn: string; // e.g., "8-12% APY"
  minInvestment: bigint; // in wei
  tokenSymbol: string;
}

export const DEMO_CAMPAIGNS: Campaign[] = [
  {
    id: "seoul-gangnam-apt",
    title: "Seoul Gangnam Premium Apartment",
    description:
      "Fractional ownership in a premium residential property in Gangnam, Seoul's most prestigious district.",
    longDescription: `Invest in a premium 150m² apartment located in the heart of Gangnam, Seoul.
    This property offers stable rental income and potential capital appreciation in Korea's most sought-after real estate market.

    Key Features:
    - Location: Gangnam-gu, Seoul
    - Property Type: Residential Apartment
    - Size: 150m² (3 bedrooms, 2 bathrooms)
    - Expected Rental Yield: 4-5% annually
    - Potential Capital Appreciation: 5-8% annually

    Investment Structure:
    - Token holders receive proportional rental income
    - Quarterly dividend distribution
    - Property professionally managed`,
    imageUrl: "/images/campaigns/gangnam-apt.jpg",
    targetAmount: BigInt("100000000000000000000"), // 100 MNT
    raisedAmount: BigInt("67500000000000000000"), // 67.5 MNT
    investorCount: 23,
    deadline: new Date("2025-01-15T23:59:59"),
    status: "active",
    category: "real-estate",
    location: "Seoul, South Korea",
    expectedReturn: "8-12% APY",
    minInvestment: BigInt("1000000000000000000"), // 1 MNT
    tokenSymbol: "SGPT",
  },
  {
    id: "jeju-solar-farm",
    title: "Jeju Island Solar Farm",
    description:
      "Green energy investment in a 5MW solar farm on Jeju Island with government-backed power purchase agreement.",
    longDescription: `Participate in Korea's renewable energy transition with this solar farm investment on Jeju Island.

    Project Details:
    - Capacity: 5MW photovoltaic system
    - Location: Jeju Island, South Korea
    - 20-year Power Purchase Agreement (PPA)
    - Government renewable energy incentives

    Returns:
    - Stable income from electricity sales
    - Carbon credit revenue
    - Expected ROI: 6-8% annually`,
    imageUrl: "/images/campaigns/jeju-solar.jpg",
    targetAmount: BigInt("200000000000000000000"), // 200 MNT
    raisedAmount: BigInt("45000000000000000000"), // 45 MNT
    investorCount: 12,
    deadline: new Date("2025-02-01T23:59:59"),
    status: "active",
    category: "energy",
    location: "Jeju Island, South Korea",
    expectedReturn: "6-8% APY",
    minInvestment: BigInt("5000000000000000000"), // 5 MNT
    tokenSymbol: "JSFT",
  },
];

// Helper function to format MNT amounts
export function formatMNT(wei: bigint): string {
  const mnt = Number(wei) / 1e18;
  return mnt.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

// Helper function to calculate progress percentage
export function calculateProgress(raised: bigint, target: bigint): number {
  if (target === BigInt(0)) return 0;
  return Math.min(100, Number((raised * BigInt(100)) / target));
}

// Helper function to calculate days remaining
export function daysRemaining(deadline: Date): number {
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// Get campaign by ID
export function getCampaignById(id: string): Campaign | undefined {
  return DEMO_CAMPAIGNS.find((c) => c.id === id);
}
