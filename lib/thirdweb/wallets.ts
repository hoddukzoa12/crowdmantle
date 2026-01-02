import { createWallet, inAppWallet } from "thirdweb/wallets";

export const wallets = [
  // Bitget Wallet - Hackathon partner bonus
  createWallet("com.bitget.web3"),

  // MetaMask - Most popular wallet
  createWallet("io.metamask"),

  // Coinbase Wallet - US market
  createWallet("com.coinbase.wallet"),

  // In-App Wallet - Email/Social login for Web2 users
  inAppWallet({
    auth: {
      options: ["email", "google", "apple"],
    },
  }),
];

// Wallet display names for UI
export const walletNames: Record<string, string> = {
  "com.bitget.web3": "Bitget Wallet",
  "io.metamask": "MetaMask",
  "com.coinbase.wallet": "Coinbase Wallet",
  inApp: "Email / Social",
};
