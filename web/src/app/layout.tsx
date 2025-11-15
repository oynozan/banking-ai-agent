import type { Metadata } from "next";
import { Inter, Noto_Sans } from "next/font/google";

import "@/styles/globals.css";
import { AssistantWidget } from "@/components/App/AssistantWidget/AssistantWidget";

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
            <body className={`${inter.variable} ${notoSans.variable} antialiased`}>
                {children}
                <AssistantWidget />
            </body>
        </html>
    );
}
