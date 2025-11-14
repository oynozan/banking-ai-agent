import Header from "@/components/App/Header";
import AppWrapper from "@/components/App/Wrapper";

export default function BankLayout({ children }: { children: React.ReactNode }) {
    return (
        <AppWrapper>
            <Header />
            <main>{children}</main>
        </AppWrapper>
    );
}
