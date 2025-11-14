'use client'

import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

interface BalanceCardProps {
  balance: number;
}

export function BalanceCard({ balance }: BalanceCardProps) {
  const [showBalance, setShowBalance] = useState(true);

  return (
    <div className="bg-gradient-to-br from-[#003d4f] to-[#002E3C] rounded-2xl p-8 border border-[#FFD700]/20 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-gray-300">Current Balance</h2>
        <button
          onClick={() => setShowBalance(!showBalance)}
          className="text-gray-400 hover:text-[#FFD700] transition-colors"
          aria-label={showBalance ? "Hide balance" : "Show balance"}
        >
          {showBalance ? <Eye size={20} /> : <EyeOff size={20} />}
        </button>
      </div>
      <div className="text-5xl text-[#FFD700] mb-2">
        {showBalance ? `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••••'}
      </div>
      <p className="text-gray-400 text-sm">Available Balance</p>
    </div>
  );
}
