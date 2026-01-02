/**
 * Wallet Service Interface - Application Layer
 * Port for wallet connection and management (Dependency Inversion)
 */

export type WalletType = 'metamask' | 'bitget' | 'coinbase' | 'walletconnect' | 'injected';

export interface WalletAccount {
  address: string;
  chainId: number;
  isConnected: boolean;
}

export interface SupportedChain {
  id: number;
  name: string;
  rpcUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrl: string;
}

export interface SignMessageResult {
  success: boolean;
  signature?: string;
  error?: string;
}

export interface IWalletService {
  /**
   * Connect to a wallet
   */
  connect(walletType?: WalletType): Promise<WalletAccount | null>;

  /**
   * Disconnect from wallet
   */
  disconnect(): Promise<void>;

  /**
   * Get current connected account
   */
  getAccount(): Promise<WalletAccount | null>;

  /**
   * Check if wallet is connected
   */
  isConnected(): Promise<boolean>;

  /**
   * Get connected address
   */
  getAddress(): Promise<string | null>;

  /**
   * Get current chain ID
   */
  getChainId(): Promise<number | null>;

  /**
   * Switch to a different chain
   */
  switchChain(chainId: number): Promise<boolean>;

  /**
   * Add a new chain to wallet
   */
  addChain(chain: SupportedChain): Promise<boolean>;

  /**
   * Sign a message
   */
  signMessage(message: string): Promise<SignMessageResult>;

  /**
   * Get supported chains
   */
  getSupportedChains(): SupportedChain[];

  /**
   * Check if a chain is supported
   */
  isChainSupported(chainId: number): boolean;

  /**
   * Listen for account changes
   */
  onAccountChange(callback: (account: WalletAccount | null) => void): () => void;

  /**
   * Listen for chain changes
   */
  onChainChange(callback: (chainId: number) => void): () => void;

  /**
   * Listen for disconnect
   */
  onDisconnect(callback: () => void): () => void;
}
