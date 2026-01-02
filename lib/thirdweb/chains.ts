import { defineChain } from "thirdweb/chains";

export const mantleSepolia = defineChain({
  id: 5003,
  name: "Mantle Sepolia Testnet",
  rpc: "https://rpc.sepolia.mantle.xyz",
  nativeCurrency: {
    name: "MNT",
    symbol: "MNT",
    decimals: 18,
  },
  blockExplorers: [
    {
      name: "Mantle Sepolia Explorer",
      url: "https://explorer.sepolia.mantle.xyz",
    },
  ],
});

// Mantle Mainnet (for production)
export const mantleMainnet = defineChain({
  id: 5000,
  name: "Mantle",
  rpc: "https://rpc.mantle.xyz",
  nativeCurrency: {
    name: "MNT",
    symbol: "MNT",
    decimals: 18,
  },
  blockExplorers: [
    {
      name: "Mantle Explorer",
      url: "https://explorer.mantle.xyz",
    },
  ],
});
