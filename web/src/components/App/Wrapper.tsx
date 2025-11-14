"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { userState } from "@/lib/states";

export default function Wrapper({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { user, state, setState, setUser } = userState();

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

                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/public/auth/validate`,
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    },
                );

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
            })();
        }
    }, [user]);

    return <>{children}</>;
}
