import { useEffect, useState } from "react";
import { Transaction } from "@/components/App/TransactionHistory/TransactionList";
import { mapApiToFrontend } from "@/lib/utils";

export const useTransactions = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTransactions = async () => {
            setIsLoading(true);
            try {
                const token = localStorage.getItem("accessToken");
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/transactions?page=1&limit=10`,
                    {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                    },
                );

                if (!response.ok) {
                    console.error("Failed to fetch transactions.");
                }

                const data = await response.json();

                const formattedTransactions = mapApiToFrontend(data.transactions);
                setTransactions(formattedTransactions);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTransactions();
    }, []);

    return {
        transactions,
        isLoading,
    };
};
