"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useUser } from "@/lib/states";
import { Toaster } from "@/components/ui/sonner";
import { connectSocket, setSocketAuthToken } from "@/lib/socket";

const queryClient = new QueryClient()

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        p5: any;
    }
}

export default function Wrapper({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { user, state, setState, setUser } = useUser();

    useEffect(() => {
        if (!user && state === "not_logged_in" && typeof window !== "undefined") {
            // get acess token from local storage
            const accessToken = localStorage.getItem("accessToken");

            // if no access token, redirect to login page
            if (!accessToken) {
                router.replace("/login");
                return;
            }

            // validate the access token
            (async () => {
                setState("loading");

                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/validate`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                });

                if (!response || !response.ok || response.status === 401) {
                    setState("not_logged_in");

                    // remove invalid access token
                    localStorage.removeItem("accessToken");

                    // redirect to login page
                    router.replace("/login");
                    return;
                }

                const data = await response.json();

                setUser(data.user);
                setState("logged_in");

                // Wire socket auth and connect after login
                setSocketAuthToken(accessToken);
                connectSocket();
            })();
        }
    }, [user]);

    return (
        <QueryClientProvider client={queryClient}>
            <Toaster richColors position="top-right" />
            {children}
        </QueryClientProvider>
    );
}
