'use client'

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Lock, Mail } from "lucide-react";
import { useState } from "react";

export function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate login
        setTimeout(() => {
            setIsLoading(false);
            console.log("Login submitted", { email, password });
        }, 1500);
    };

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
                <Label htmlFor="email" className="text-white/90">
                    Username or Email
                </Label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-[#FFD700]/60" />
                    <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
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
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus-visible:border-[#FFD700] focus-visible:ring-[#FFD700]/30 h-12"
                    />
                </div>
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end">
                <button
                    type="button"
                    className="text-sm text-white/60 hover:text-[#FFD700] transition-colors underline decoration-[#FFD700]/0 hover:decoration-[#FFD700] underline-offset-4"
                >
                    Forgot Password?
                </button>
            </div>

            {/* Login Button */}
            <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-[#FFD700] text-card hover:bg-[#FFD700]/90 shadow-lg shadow-[#FFD700]/20"
            >
                {isLoading ? "Logging in..." : "Login"}
            </Button>

            {/* Sign Up Link */}
            <div className="text-center pt-4">
                <p className="text-sm text-white/60">
                    Don&#39;t have an account?{" "}
                    <button
                        type="button"
                        className="text-[#FFD700] hover:text-[#FFD700]/80 transition-colors underline underline-offset-4"
                    >
                        Sign Up
                    </button>
                </p>
            </div>
        </form>
    );
}
