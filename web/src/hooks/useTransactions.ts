import { useEffect, useState } from "react";
import { Transaction } from "@/components/App/TransactionHistory/TransactionList";
import { mapApiToFrontend } from "@/lib/utils";

export interface MonthlyStats {
    income: number;
    expenses: number;
    netChange: number;
}

export const useTransactions = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [stats, setStats] = useState<MonthlyStats>({
        income: 0,
        expenses: 0,
        netChange: 0,
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const token = localStorage.getItem("accessToken");
                const apiUrl = process.env.NEXT_PUBLIC_API_URL;

                const authHeaders = {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                };

                const [transRes, statsRes] = await Promise.all([
                    fetch(`${apiUrl}/transactions?page=1&limit=10`, authHeaders),
                    fetch(`${apiUrl}/stats/monthly`, authHeaders),
                ]);

                if (!transRes.ok || !statsRes.ok) {
                    console.error("Failed to fetch dashboard data.");
                    throw new Error("Failed to fetch dashboard data");
                }

                const transData = await transRes.json();
                const statsData = await statsRes.json();

                const formattedTransactions = mapApiToFrontend(transData.transactions);
                setTransactions(formattedTransactions);
                setStats(statsData);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    return {
        transactions,
        stats,
        isLoading,
    };
};
