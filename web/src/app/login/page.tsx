import { LoginForm } from "@/components/App/Forms/LoginForm";
import { Shield } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4">

            <div className="relative w-full max-w-md">
                <div className="bg-card/80 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl p-8 md:p-10">
                    <div className="mb-8">
                        <Image src='/commerz_logo.png' alt='logo' width={500} height={40}  />
                    </div>

                    <LoginForm />

                    <div className="mt-8 pt-6 border-t border-white/10">
                        <div className="flex items-center justify-center gap-2 text-white/50 text-xs">
                            <Shield className="size-4" />
                            <span>Your connection is secured with 256-bit encryption</span>
                        </div>
                    </div>
                </div>

                <div className="mt-6 text-center space-x-4 text-sm">
                    <button className="text-white/50 hover:text-[#FFD700] transition-colors">
                        Privacy Policy
                    </button>
                    <span className="text-white/30">•</span>
                    <button className="text-white/50 hover:text-[#FFD700] transition-colors">
                        Terms of Service
                    </button>
                    <span className="text-white/30">•</span>
                    <button className="text-white/50 hover:text-[#FFD700] transition-colors">
                        Help
                    </button>
                </div>
            </div>
        </div>
    );
}
