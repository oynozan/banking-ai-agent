import Image from "next/image";

import { LoginForm } from "@/components/App/Forms/LoginForm";

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="relative w-full max-w-md">
                <div className="bg-card/80 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl p-8 md:p-10">
                    <div className="mb-8">
                        <Image src="/logo.svg" alt="logo" width={500} height={40} />
                    </div>

                    <LoginForm />
                </div>

                <div className="mt-6 text-center space-x-4 text-sm">
                    <button className="text-white/50 hover:text-gold transition-colors">
                        Privacy Policy
                    </button>
                    <span className="text-white/30">•</span>
                    <button className="text-white/50 hover:text-gold transition-colors">
                        Terms of Service
                    </button>
                    <span className="text-white/30">•</span>
                    <button className="text-white/50 hover:text-gold transition-colors">
                        Help
                    </button>
                </div>
            </div>
        </div>
    );
}
