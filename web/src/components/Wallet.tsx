"use client";

// Particle imports
import { ConnectKitProvider, createConfig } from "@particle-network/connectkit";
import { authWalletConnectors } from "@particle-network/connectkit/auth";
import { evmWalletConnectors } from "@particle-network/connectkit/evm";
import { EntryPosition, wallet } from "@particle-network/connectkit/wallet";
import { mainnet } from "@particle-network/connectkit/chains";
import React from "react";

const config = createConfig({
    projectId: process.env.NEXT_PUBLIC_PROJECT_ID!,
    clientKey: process.env.NEXT_PUBLIC_CLIENT_KEY!,
    appId: process.env.NEXT_PUBLIC_APP_ID!,

    appearance: {
        recommendedWallets: [
            // { walletId: "metaMask", label: "Recommended" },
            { walletId: "coinbaseWallet", label: "popular" },
            { walletId: "phantom", label: "popular" },
        ],
        language: "en-US",
        mode: "dark", // dark or auto.
    },
    walletConnectors: [
        evmWalletConnectors({
            metadata: {
                name: "Mock Bank",
                icon: "",
                description: "Mock Bank Banking AI Agent.",
                url: typeof window !== "undefined" ? window.location.origin : "",
            },
            walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID as string,
        }),
    ],
    plugins: [
        wallet({
            visible: false,
            entryPosition: EntryPosition.BL,
        }),
    ],
    chains: [mainnet],
});

export const Wallet = ({ children }: React.PropsWithChildren) => {
    return <ConnectKitProvider config={config}>{children}</ConnectKitProvider>;
};
