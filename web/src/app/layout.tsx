import Script from "next/script";
import type { Metadata } from "next";
import { Inter, Noto_Sans } from "next/font/google";

import { AssistantWidget } from "@/components/App/Chat/AssistantWidget";
import { Wallet } from "@/components/Wallet";

import "@/styles/globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
    display: "swap",
});

const notoSans = Noto_Sans({
    subsets: ["latin"],
    variable: "--font-noto",
    display: "swap",
});

export const metadata: Metadata = {
    title: "Banking AI Agent",
    description: "An AI agent that helps you manage your banking tasks efficiently.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <head>
                {/* Load p5.js first */}
                <Script
                    src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/p5.min.js"
                    strategy="beforeInteractive"
                />
                {/* Then load p5.speech */}
                <Script
                    src="https://cdn.jsdelivr.net/gh/IDMNYU/p5.js-speech@0.0.3/lib/p5.speech.js"
                    strategy="beforeInteractive"
                />
            </head>
            <body className={`${inter.variable} ${notoSans.variable} antialiased`}>
                <Wallet>
                    {children}
                    <AssistantWidget />
                </Wallet>
            </body>
        </html>
    );
}
