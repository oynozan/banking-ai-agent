import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "@/styles/globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
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
            <body className={`${inter.variable} antialiased`}>{children}</body>
        </html>
    );
}
