// Securities Crowdfunding Regulations Constants (PRD Section 12.2)

export const KR_CROWDFUNDING_RULES = {
  // Individual investor annual limit
  INDIVIDUAL_ANNUAL_LIMIT_KRW: 50_000_000, // ~$40,000 (KRW equivalent)
  INDIVIDUAL_ANNUAL_LIMIT_USDC: 500, // ~500 MNT (demo purposes)

  // Professional investor limit (no limit)
  PROFESSIONAL_LIMIT: null,

  // Refund policy on goal not met
  REFUND_ON_FAILURE: true,
  REFUND_PERCENTAGE: 100, // 100% full refund

  // Funding period limits
  MIN_FUNDING_DAYS: 7,
  MAX_FUNDING_DAYS: 60,

  // Minimum investment amount (platform policy)
  MIN_INVESTMENT_USDC: 10,

  // Platform fee
  PLATFORM_FEE_PERCENTAGE: 2, // Blockchain: 2% vs Traditional: 5%

  // Investment confirmation required
  INVESTMENT_CONFIRMATION_REQUIRED: true,
} as const;

// Investment limit check result type
export interface InvestmentLimitCheckResult {
  isAllowed: boolean;
  remainingLimit: number;
  message: string;
}

/**
 * Check if investment amount is within individual limit
 * @param amount - Investment amount in USDC
 * @param previousInvestments - Total previous investments in USDC (current year)
 * @returns Limit check result
 */
export function checkInvestmentLimit(
  amount: number,
  previousInvestments: number = 0
): InvestmentLimitCheckResult {
  const limit = KR_CROWDFUNDING_RULES.INDIVIDUAL_ANNUAL_LIMIT_USDC;
  const totalAfterInvestment = previousInvestments + amount;

  if (totalAfterInvestment > limit) {
    return {
      isAllowed: false,
      remainingLimit: Math.max(0, limit - previousInvestments),
      message: `Limit exceeded: Annual individual investment limit is ${limit} MNT. Remaining limit: ${Math.max(0, limit - previousInvestments)} MNT`,
    };
  }

  return {
    isAllowed: true,
    remainingLimit: limit - totalAfterInvestment,
    message: `Investment allowed. Remaining limit after investment: ${limit - totalAfterInvestment} MNT`,
  };
}

/**
 * Check minimum investment amount
 * @param amount - Investment amount in USDC
 * @returns Whether amount meets minimum requirement
 */
export function checkMinimumInvestment(amount: number): boolean {
  return amount >= KR_CROWDFUNDING_RULES.MIN_INVESTMENT_USDC;
}

/**
 * Calculate platform fee
 * @param amount - Investment amount
 * @returns Fee amount
 */
export function calculatePlatformFee(amount: number): number {
  return amount * (KR_CROWDFUNDING_RULES.PLATFORM_FEE_PERCENTAGE / 100);
}

/**
 * Format limit message for display
 */
export function formatLimitMessage(limit: number, used: number): string {
  const percentage = Math.min(100, (used / limit) * 100);
  return `${used.toLocaleString()} / ${limit.toLocaleString()} MNT used (${percentage.toFixed(1)}%)`;
}

// Risk warning messages (securities law compliance)
export const RISK_WARNINGS = {
  PRINCIPAL_LOSS: "Principal Loss Risk: You may lose all or part of your investment.",
  LIQUIDITY_RISK: "Liquidity Risk: Token resale may be difficult.",
  STARTUP_RISK: "Startup investments carry high risk.",
  NO_GUARANTEE: "Expected returns are not guaranteed.",
  DISCLOSURE: "Please review the investment prospectus before investing.",
} as const;

// Investment confirmation steps (regulation compliance)
export const CONFIRMATION_STEPS = [
  {
    id: "risk_acknowledgment",
    title: "Risk Disclosure",
    description: "I understand there is a risk of principal loss.",
    required: true,
  },
  {
    id: "limit_acknowledgment",
    title: "Investment Limit",
    description: "I understand there is an annual individual investment limit.",
    required: true,
  },
  {
    id: "refund_policy",
    title: "Refund Policy",
    description: "I understand 100% refund applies if goal is not met.",
    required: true,
  },
  {
    id: "final_confirmation",
    title: "Final Confirmation",
    description: "I have reviewed all terms and agree to proceed.",
    required: true,
  },
] as const;
