'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import StatCard from '@/components/StatCard';
import ProgressCircle from '@/components/ProgressCard';
import { FaWallet, FaPiggyBank, FaDollarSign, FaChartLine, FaUserCircle } from 'react-icons/fa';
import Image from 'next/image';
import { useAuth } from '@/components/context/AuthContext';
import { useRouter } from 'next/navigation';
import logo from '@/app/assets/navbar/Tradelogo.png';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useDashboard } from '@/lib/hooks/useDashboard';

// ✅ Generate a dynamic fallback chart instead of static zeros
const generateFallbackChart = () => {
  const now = new Date();
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const currentMonth = now.getMonth();

  return months.slice(0, currentMonth + 1).map((m, i) => ({
    month: m,
    // Smooth fake growth pattern
    earnings: Math.floor(500 + i * 200 + Math.random() * 150),
  }));
};

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const router = useRouter();
  const { dashboard, isLoading, isError, mutate } = useDashboard(user?.email || null);

  useEffect(() => {
    if (!user) {
      router.push('/screens/auth/Signin');
      return;
    }
  }, [user, router]);

  // ===============================
  // UI RENDER
  // ===============================

  if (!user)
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0b1130] text-white">
        Redirecting to sign in...
      </div>
    );

  if (isLoading)
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0b1130] text-white space-y-6">
        <AiOutlineLoading3Quarters className="animate-spin" size={40} />
        <Image src={logo} alt="Trades Global FX" width={160} height={60} />
        <p className="text-slate-400 text-sm">Loading your dashboard...</p>
      </div>
    );

  if (isError || !dashboard)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0b1130] text-red-400 space-y-3">
        <p className="text-lg font-semibold">⚠️ Failed to load dashboard</p>
        <button
          onClick={() => mutate()}
          className="bg-green-600 px-4 py-2 rounded text-white hover:bg-green-500 transition"
        >
          Retry
        </button>
      </div>
    );

  const data = dashboard;

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-x-hidden">
      <Sidebar />

      <main className="flex-1 p-4 sm:p-6 md:p-8 bg-[#0b1130] text-slate-200 relative">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <h1 className="text-2xl md:text-3xl font-semibold">Dashboard</h1>

          {/* User Dropdown */}
          <div className="relative">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setShowDropdown((prev) => !prev)}
            >
              <FaUserCircle size={35} className="text-green-400" />
            </div>

            {showDropdown && (
              <div
                className="absolute right-0 mt-3 w-64 bg-[#0f274f] text-white rounded-lg shadow-xl p-4 z-50 border border-slate-700"
                onMouseLeave={() => setShowDropdown(false)}
              >
                <h3 className="font-semibold text-lg mb-2">Account Info</h3>
                <div className="space-y-1 text-sm text-slate-300">
                  <p>
                    <span className="text-slate-400">Username:</span> {user.username || 'N/A'}
                  </p>
                  <p>
                    <span className="text-slate-400">Full Name:</span>{' '}
                    {`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A'}
                  </p>
                  <p>
                    <span className="text-slate-400">Email:</span> {user.email}
                  </p>
                  <p>
                    <span className="text-slate-400">Total Balance:</span> $
                    {((data.mainBalance || 0) + (data.interestBalance || 0)).toFixed(2)}
                  </p>
                </div>

                <button
                  onClick={() => {
                    logout();
                    router.push('/screens/auth/Signin');
                  }}
                  className="mt-4 w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Top Stats */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Main Balance"
            value={`$${data.mainBalance.toFixed(2)}`}
            icon={<FaWallet />}
          />
          <StatCard
            title="Interest Balance"
            value={`$${data.interestBalance.toFixed(2)}`}
            icon={<FaPiggyBank />}
          />
          <StatCard
            title="Total Deposit"
            value={`$${data.totalDeposit.toFixed(2)}`}
            icon={<FaDollarSign />}
          />
          <StatCard
            title="Total Earn"
            value={`$${data.totalEarn.toFixed(2)}`}
            icon={<FaChartLine />}
          />
        </section>

        {/* ROI + Chart */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#0f274f] p-4 sm:p-6 rounded-xl min-h-[260px]">
            <h2 className="text-lg font-semibold text-slate-200 mb-4">Monthly Earnings Overview</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="earnings"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-[#0f274f] p-4 sm:p-6 rounded-xl flex flex-wrap items-center justify-center gap-6">
            <ProgressCircle label="Invest Completed" percent={data.stats.investCompleted || 0} />
            <ProgressCircle label="ROI Speed" percent={data.stats.roiSpeed || 0} />
            <ProgressCircle label="ROI Redeemed" percent={data.stats.roiRedeemed || 0} />
          </div>
        </section>

        {/* Pending Deposits */}
        {data.pendingDeposits?.length > 0 && (
          <div className="mt-8 bg-yellow-500/10 p-4 rounded overflow-x-auto text-sm">
            <h3 className="font-semibold text-yellow-200 mb-2">Pending Deposits</h3>
            {data.pendingDeposits.map((p) => (
              <div
                key={p.id}
                className="flex justify-between text-sm text-yellow-100 border-b border-yellow-200/10 py-2 min-w-[320px]"
              >
                <div>
                  ${Number(p.amount || 0).toFixed(2)} — {p.currency} — {p.address}
                </div>
                <div>
                  {p.status} • {new Date(p.createdAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Deposit History */}
        {data.depositHistory?.length > 0 && (
          <div className="mt-8 bg-slate-800/50 p-4 rounded overflow-x-auto text-sm">
            <h3 className="font-semibold text-slate-200 mb-2">Deposit History</h3>
            {data.depositHistory.map((d) => (
              <div
                key={d.id}
                className="flex justify-between text-sm text-slate-300 border-b border-slate-600/30 py-2 min-w-[320px]"
              >
                <div>
                  ${Number(d.amount || 0).toFixed(2)} — {d.currency} — {d.address}
                </div>
                <div>
                  {d.status} • {new Date(d.createdAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Pending Withdrawals */}
        {data.pendingWithdrawals?.length > 0 && (
          <div className="mt-8 bg-red-500/10 p-4 rounded overflow-x-auto text-sm">
            <h3 className="font-semibold text-red-200 mb-2">Pending Withdrawals</h3>
            {data.pendingWithdrawals.map((w) => (
              <div
                key={w.id}
                className="flex justify-between text-sm text-red-100 border-b border-red-200/10 py-2 min-w-[320px]"
              >
                <div>${Number(w.amount || 0).toFixed(2)}</div>
                <div>
                  {w.status} • {new Date(w.createdAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
