import Header from "@/components/App/Header";
import AppWrapper from "@/components/App/Wrapper";

export default function BankLayout({ children }: { children: React.ReactNode }) {
    return (
        <AppWrapper>
            <Header />
            <main className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                {children}
            </main>
        </AppWrapper>
    );
}
