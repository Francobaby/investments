'use client';

import React from 'react';
import { useAuth } from '@/components/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import { useTransactions } from '@/lib/hooks/useTransactions';

interface TransactionItem {
  id: number;
  amount: number;
  status: string;
  createdAt: string;
  planName?: string;
  roi?: number;
  duration?: string;
}

export default function Transaction() {
  const { user } = useAuth();
  const { transactions, isLoading, isError, mutate } = useTransactions(user?.id || null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b1130] text-white flex items-center justify-center">
        Loading transactions...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-[#0b1130] text-red-400 flex flex-col items-center justify-center space-y-4">
        <p className="text-lg font-semibold">⚠️ Failed to load transactions</p>
        <button
          onClick={() => mutate()}
          className="bg-green-600 px-4 py-2 rounded text-white hover:bg-green-500 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-x-hidden">
      <Sidebar />

      <div className="flex-1 p-4 sm:p-6 md:p-8 bg-[#0b1130] text-slate-200">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center md:text-left">
          Transactions
        </h1>

        <TransactionTable
          title="Deposit History"
          data={transactions.depositHistory ?? []}
          emptyMessage="No deposits yet."
        />

        <TransactionTable
          title="Withdrawal History"
          data={transactions.withdrawalHistory ?? []}
          emptyMessage="No withdrawals yet."
        />

        <InvestmentTable
          title="Investment History"
          data={transactions.investmentHistory ?? []}
          emptyMessage="No investments yet."
        />
      </div>
    </div>
  );
}

// Reusable Transaction Table
function TransactionTable({
  title,
  data,
  emptyMessage,
}: {
  title: string;
  data: TransactionItem[];
  emptyMessage: string;
}) {
  return (
    <div className="mb-10">
      <h2 className="text-lg sm:text-xl font-semibold mb-4 text-center md:text-left">{title}</h2>
      {data.length === 0 ? (
        <p className="text-slate-400 text-center md:text-left">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg">
          <table className="w-full min-w-[600px] bg-[#0f274f] rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-[#152d52] text-sm sm:text-base">
                <th className="p-3 text-left">ID</th>
                <th className="p-3 text-left">Amount</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.map((tx) => (
                <tr key={tx.id} className="border-t border-slate-700 text-sm sm:text-base">
                  <td className="p-3 text-xs text-slate-400">{tx.id}</td>
                  <td className="p-3">${tx.amount.toFixed(2)}</td>
                  <td
                    className={`p-3 font-semibold ${
                      tx.status === 'Completed' ? 'text-green-400' : 'text-yellow-400'
                    }`}
                  >
                    {tx.status}
                  </td>
                  <td className="p-3">{new Date(tx.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Reusable Investment Table
function InvestmentTable({
  title,
  data,
  emptyMessage,
}: {
  title: string;
  data: TransactionItem[];
  emptyMessage: string;
}) {
  return (
    <div className="mb-10">
      <h2 className="text-lg sm:text-xl font-semibold mb-4 text-center md:text-left">{title}</h2>
      {data.length === 0 ? (
        <p className="text-slate-400 text-center md:text-left">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg">
          <table className="w-full min-w-[700px] bg-[#0f274f] rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-[#152d52] text-sm sm:text-base">
                <th className="p-3 text-left">ID</th>
                <th className="p-3 text-left">Plan</th>
                <th className="p-3 text-left">Amount</th>
                <th className="p-3 text-left">ROI</th>
                <th className="p-3 text-left">Duration</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Start Date</th>
              </tr>
            </thead>
            <tbody>
              {data.map((inv) => (
                <tr key={inv.id} className="border-t border-slate-700 text-sm sm:text-base">
                  <td className="p-3 text-xs text-slate-400">{inv.id}</td>
                  <td className="p-3">{inv.planName || 'N/A'}</td>
                  <td className="p-3">${inv.amount.toFixed(2)}</td>
                  <td className="p-3">{inv.roi ? `${inv.roi}%` : 'N/A'}</td>
                  <td className="p-3">{inv.duration || 'N/A'}</td>
                  <td
                    className={`p-3 font-semibold ${
                      inv.status === 'Completed' ? 'text-green-400' : 'text-yellow-400'
                    }`}
                  >
                    {inv.status}
                  </td>
                  <td className="p-3">{new Date(inv.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
