"use client";

import { ConnectButton } from "thirdweb/react";
import { client } from "@/lib/thirdweb/client";
import { wallets } from "@/lib/thirdweb/wallets";
import { mantleSepolia } from "@/lib/thirdweb/chains";

export function ConnectButtonWrapper() {
  return (
    <ConnectButton
      client={client}
      wallets={wallets}
      chain={mantleSepolia}
      connectModal={{
        size: "compact",
        title: "CrowdMantle",
        titleIcon: "",
        showThirdwebBranding: false,
      }}
      connectButton={{
        label: "Connect Wallet",
        className:
          "!bg-primary !text-primary-foreground !rounded-lg !px-4 !py-2 !font-medium hover:!bg-primary/90 !transition-colors",
      }}
      detailsButton={{
        className:
          "!bg-secondary !text-secondary-foreground !rounded-lg !px-4 !py-2 !font-medium",
      }}
    />
  );
}
