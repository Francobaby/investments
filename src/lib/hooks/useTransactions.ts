import useSWR from "swr";

interface TransactionItem {
  id: number;
  amount: number;
  status: string;
  createdAt: string;
  type?: string;
  planName?: string;
  roi?: number;
  duration?: string;
}

interface TransactionData {
  depositHistory: TransactionItem[];
  withdrawalHistory: TransactionItem[];
  investmentHistory: TransactionItem[];
}

const fetcher = async (url: string): Promise<TransactionData> => {
  const res = await fetch(url);

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to load transactions: ${res.status} - ${errorText}`);
  }

  const data = await res.json();

  return {
    depositHistory: data?.depositHistory || [],
    withdrawalHistory: data?.withdrawalHistory || [],
    investmentHistory: data?.investmentHistory || [],
  };
};

export function useTransactions(userId: number | null) {
  const { data, error, mutate } = useSWR<TransactionData>(
    userId ? `/api/transaction?userId=${userId}` : null,
    fetcher,
    {
      refreshInterval: 15000,
      revalidateOnFocus: true,
    }
  );

  return {
    transactions:
      data || {
        depositHistory: [],
        withdrawalHistory: [],
        investmentHistory: [],
      },
    isLoading: !data && !error,
    isError: Boolean(error),
    mutate,
  };
}
