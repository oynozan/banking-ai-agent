"use client"

import { useState } from 'react';
import { BalanceCard } from '@/components/BalanceCard';
import { TransactionList, Transaction } from '@/components/TransactionList';
import { QuickActionCard } from '@/components/QuickActionCard';
import { Send, FileText, PieChart, Settings, Download, Bell } from 'lucide-react';

// Mock transaction data
const mockTransactions: Transaction[] = [
    {
        id: '1',
        date: 'Nov 14, 2025',
        merchant: 'Salary Deposit',
        category: 'Income',
        amount: 5250.00,
        type: 'credit',
    },
    {
        id: '2',
        date: 'Nov 13, 2025',
        merchant: 'Amazon Purchase',
        category: 'Shopping',
        amount: 89.99,
        type: 'debit',
    },
    {
        id: '3',
        date: 'Nov 12, 2025',
        merchant: 'Starbucks',
        category: 'Food & Dining',
        amount: 12.45,
        type: 'debit',
    },
    {
        id: '4',
        date: 'Nov 12, 2025',
        merchant: 'Netflix Subscription',
        category: 'Entertainment',
        amount: 15.99,
        type: 'debit',
    },
    {
        id: '5',
        date: 'Nov 11, 2025',
        merchant: 'Shell Gas Station',
        category: 'Transportation',
        amount: 52.30,
        type: 'debit',
    },
    {
        id: '6',
        date: 'Nov 10, 2025',
        merchant: 'Whole Foods',
        category: 'Groceries',
        amount: 124.67,
        type: 'debit',
    },
    {
        id: '7',
        date: 'Nov 9, 2025',
        merchant: 'Freelance Payment',
        category: 'Income',
        amount: 850.00,
        type: 'credit',
    },
    {
        id: '8',
        date: 'Nov 8, 2025',
        merchant: 'Electric Bill',
        category: 'Utilities',
        amount: 145.22,
        type: 'debit',
    },
    {
        id: '9',
        date: 'Nov 7, 2025',
        merchant: 'Gym Membership',
        category: 'Health & Fitness',
        amount: 49.99,
        type: 'debit',
    },
    {
        id: '10',
        date: 'Nov 6, 2025',
        merchant: 'Investment Return',
        category: 'Income',
        amount: 320.50,
        type: 'credit',
    },
];

export default function App() {
    const [currentBalance] = useState(12847.58);

    return (
        <div className="min-h-screen bg-[#002E3C] py-8 px-4 sm:px-6 lg:px-8">
            <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #002E3C;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #FFD700;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #ffd700cc;
        }
      `}</style>

            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <header className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl text-white mb-1">Account Overview</h1>
                        <p className="text-gray-400">Welcome back! Here&#39;s your financial summary</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="p-2 text-gray-400 hover:text-[#FFD700] transition-colors rounded-lg hover:bg-[#003d4f]">
                            <Bell size={24} />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-[#FFD700] transition-colors rounded-lg hover:bg-[#003d4f]">
                            <Settings size={24} />
                        </button>
                    </div>
                </header>

                {/* Balance Card */}
                <div className="mb-8">
                    <BalanceCard balance={currentBalance} />
                </div>

                {/* Quick Actions */}
                <div className="mb-8">
                    <h2 className="text-xl text-white mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <QuickActionCard
                            icon={Send}
                            title="Transfer Money"
                            description="Send money to other accounts instantly"
                            onClick={() => console.log('Transfer clicked')}
                        />
                        <QuickActionCard
                            icon={FileText}
                            title="Pay Bills"
                            description="Manage and pay your upcoming bills"
                            onClick={() => console.log('Pay bills clicked')}
                        />
                        <QuickActionCard
                            icon={PieChart}
                            title="Budgeting Tools"
                            description="Track spending and set financial goals"
                            onClick={() => console.log('Budgeting clicked')}
                        />
                    </div>
                </div>

                {/* Transactions */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <TransactionList transactions={mockTransactions} />
                    </div>

                    {/* Additional Actions */}
                    <div className="space-y-4">
                        <div className="bg-[#003d4f] rounded-2xl p-6 border border-[#FFD700]/20">
                            <h3 className="text-white mb-4">Quick Stats</h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-gray-400 text-sm mb-1">This Month&#39;s Income</p>
                                    <p className="text-[#FFD700] text-2xl">+$6,420.50</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm mb-1">This Month&#39;s Expenses</p>
                                    <p className="text-white text-2xl">-$490.61</p>
                                </div>
                                <div className="pt-4 border-t border-gray-700">
                                    <p className="text-gray-400 text-sm mb-1">Net Change</p>
                                    <p className="text-[#FFD700] text-2xl">+$5,929.89</p>
                                </div>
                            </div>
                        </div>

                        <button className="w-full bg-[#003d4f] rounded-xl p-4 border border-[#FFD700]/20 hover:border-[#FFD700]/40 hover:bg-[#004555] transition-all flex items-center justify-center gap-2 text-white">
                            <Download size={20} className="text-[#FFD700]" />
                            Download Statement
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
