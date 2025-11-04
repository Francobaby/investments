"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface User {
  id?: number;
  email: string;
  firstName: string;
  lastName: string
  username?: string;
  mainBalance: number;
  totalDeposit: number;
  totalWithdrawals?: number;
  investmentBalance?: number;
  totalEarn?: number;
  roi?: number;
  redeemedRoi?: number;
  speedInvest?: number;
  completed?: number;
}

interface LoginResponse {
  user: User;
  error?: string;
}

interface SignupResponse {
  user: User;
  error?: string;
}

interface RefreshResponse {
  user: Partial<User>;
  error?: string;
}

interface AuthContextType
{
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (formData: any) => Promise<boolean>;
  logout: () => void;
  updateBalances: (balances: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

//context creation
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  // ✅ Rehydrate user from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // ✅ LOGIN
  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data: LoginResponse = await res.json();
      if (!res.ok) {
        console.error("Login failed:", data.error);
        return false;
      }

      const userData: User = {
        id: data.user.id,
        email: data.user.email,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        username: data.user.username || "",
        mainBalance: data.user.mainBalance ?? 0,
        totalDeposit: data.user.totalDeposit ?? 0,
        totalWithdrawals: data.user.totalWithdrawals ?? 0,
        investmentBalance: data.user.investmentBalance ?? 0,
        totalEarn: data.user.totalEarn ?? 0,
        roi: data.user.roi ?? 0,
        redeemedRoi: data.user.redeemedRoi ?? 0,
        speedInvest: data.user.speedInvest ?? 0,
        completed: data.user.completed ?? 0,
      };

      setUser(userData);
      localStorage.setItem("currentUser", JSON.stringify(userData));
      return true;
    } catch (err) {
      console.error("Login error:", err);
      return false;
    }
  };

  // ✅ SIGNUP
  const signup = async (formData: any) => {
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data: SignupResponse = await res.json();
      if (!res.ok) {
        console.error("Signup failed:", data.error);
        return false;
      }

      const userData: User = {
        id: data.user.id,
        email: data.user.email,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        username: data.user.username || "",
        mainBalance: data.user.mainBalance ?? 0,
        totalDeposit: data.user.totalDeposit ?? 0,
        totalWithdrawals: data.user.totalWithdrawals ?? 0,
        investmentBalance: data.user.investmentBalance ?? 0,
        totalEarn: data.user.totalEarn ?? 0,
        roi: data.user.roi ?? 0,
        redeemedRoi: data.user.redeemedRoi ?? 0,
        speedInvest: data.user.speedInvest ?? 0,
        completed: data.user.completed ?? 0,
      };

      setUser(userData);
      localStorage.setItem("currentUser", JSON.stringify(userData));
      return true;
    } catch (err) {
      console.error("Signup error:", err);
      return false;
    }
  };

  // ✅ LOGOUT
  const logout = () => {
    setUser(null);
    localStorage.removeItem("currentUser");
    router.push("/screens/auth/Signin");
  };

  // ✅ UPDATE BALANCES LOCALLY
  const updateBalances = (balances: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...balances };
      localStorage.setItem("currentUser", JSON.stringify(updated));
      return updated;
    });
  };

  // ✅ REFRESH USER FROM BACKEND (real-time canonical sync)
  const refreshUser = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/user?id=${user.id}`, { cache: "no-store" });
      if (!res.ok) return;
      const data: RefreshResponse = await res.json();

      const updatedUser = {
        ...user,
        ...data.user, // overwrite balances with latest canonical data
      };

      setUser(updatedUser);
      localStorage.setItem("currentUser", JSON.stringify(updatedUser));
    } catch (err) {
      console.error("Failed to refresh user:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        login,
        signup,
        logout,
        updateBalances,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
