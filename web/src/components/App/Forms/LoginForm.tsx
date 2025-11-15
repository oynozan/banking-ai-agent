"use client";

import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Lock, UserRound } from "lucide-react";

import { useUser } from "@/lib/states";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function LoginForm() {
    const router = useRouter();
    const { user, setUser, setState } = useUser();

    const [id, setID] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user) router.replace("/");
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setIsLoading(true);
        setState("loading");

        try {
            const loginResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ id, password }),
            });

            if (!loginResponse.ok) {
                toast.error("An error occurred during login. Please try again.");
                setIsLoading(false);
                setState("not_logged_in");
                return;
            }

            const loginData = await loginResponse.json();

            if (!loginData.status) {
                toast.error(loginData.error || "Invalid credentials. Please try again.");
                setIsLoading(false);
                setState("not_logged_in");
                return;
            }

            // set user data & access token
            setUser(loginData.user);
            setState("logged_in");

            localStorage.setItem("accessToken", loginData.accessToken);
            toast.success("Logged in successfully!");

            router.replace("/");
        } catch (error) {
            console.error(error);
            toast.error("An error occurred during login. Please try again.");
            setIsLoading(false);
            setState("not_logged_in");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
            <div className="space-y-2">
                <Label htmlFor="id" className="text-white/90">
                    Account ID
                </Label>
                <div className="relative">
                    <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-[#FFD700]/60" />
                    <Input
                        id="id"
                        type="text"
                        placeholder="Enter your account ID"
                        value={id}
                        onChange={e => setID(e.target.value)}
                        required
                        className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus-visible:border-[#FFD700] focus-visible:ring-[#FFD700]/30 h-12"
                    />
                </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
                <Label htmlFor="password" className="text-white/90">
                    Password
                </Label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-[#FFD700]/60" />
                    <Input
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus-visible:border-[#FFD700] focus-visible:ring-[#FFD700]/30 h-12"
                    />
                </div>
            </div>

            {/* Forgot Password Link */}
            {/* <div className="flex justify-end">
                <button
                    type="button"
                    className="text-sm text-white/60 hover:text-[#FFD700] transition-colors underline decoration-[#FFD700]/0 hover:decoration-[#FFD700] underline-offset-4"
                >
                    Forgot Password?
                </button>
            </div> */}

            {/* Login Button */}
            <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-[#FFD700] text-card hover:bg-[#FFD700]/90 shadow-lg shadow-[#FFD700]/20 rounded-xl!"
            >
                {isLoading ? "Logging in..." : "Login"}
            </Button>
        </form>
    );
}
