/**
 * Blockchain Service Interface - Application Layer
 * Port for blockchain interactions (Dependency Inversion)
 */

export interface TransactionResult {
  success: boolean;
  transactionHash: string;
  blockNumber?: number;
  error?: string;
}

export interface ContractCallResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface WalletInfo {
  address: string;
  balance: bigint;
  chainId: number;
  isConnected: boolean;
}

export interface IBlockchainService {
  // Wallet operations
  getConnectedAddress(): Promise<string | null>;
  getWalletInfo(): Promise<WalletInfo | null>;
  isConnected(): Promise<boolean>;

  // Balance operations
  getBalance(address: string): Promise<bigint>;
  getTokenBalance(address: string, tokenAddress: string): Promise<bigint>;

  // Crowdfunding operations
  invest(projectAddress: string, amount: bigint): Promise<TransactionResult>;
  refund(projectAddress: string): Promise<TransactionResult>;
  claimTokens(projectAddress: string): Promise<TransactionResult>;
  getProjectFundRaised(projectAddress: string): Promise<bigint>;
  getProjectInvestorCount(projectAddress: string): Promise<number>;
  getInvestorContribution(projectAddress: string, investor: string): Promise<bigint>;

  // Equity Token operations
  getEquityTokenBalance(tokenAddress: string, investor: string): Promise<bigint>;
  getEquityTokenInfo(tokenAddress: string): Promise<{ name: string; symbol: string; totalSupply: bigint }>;

  // Transaction utilities
  waitForTransaction(hash: string): Promise<TransactionResult>;
  getTransactionReceipt(hash: string): Promise<unknown>;
  estimateGas(operation: string, params: unknown[]): Promise<bigint>;
}
