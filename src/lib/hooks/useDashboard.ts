import useSWR from 'swr';

interface DashboardData {
  mainBalance: number;
  interestBalance: number;
  totalDeposit: number;
  totalEarn: number;
  stats: {
    investCompleted: number;
    roiSpeed: number;
    roiRedeemed: number;
  };
  pendingDeposits: Array<{
    id: number;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
  }>;
  /**
   *  NEW Include or Account for pending withdrawals as "pendingWithdrawals"
   *  
   *  schema is same with "pendingDeposits"
   */
  depositHistory: Array<{
    id: number;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
  }>;
  monthlyData: Array<{
    month: string;
    deposits: number;
    invest: number;
    roi: number;
    interest: number;
  }>;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useDashboard(userEmail: string | null) {
  const { data, error, mutate } = useSWR<DashboardData>(
    userEmail ? `/api/dashboard?user=${encodeURIComponent(userEmail)}` : null,
    fetcher,
    {
      refreshInterval: 10000, // Refresh every 10 seconds for dashboard
      revalidateOnFocus: true,
    }
  );

  return {
    dashboard: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}
