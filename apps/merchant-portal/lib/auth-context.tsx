"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useRouter } from "next/navigation";
import api from "./api";

interface Merchant {
  id: string;
  name: string;
  email: string;
  status: string;
  baseCurrency: string;
  kycStatus: string;
  country?: string;
  businessType?: string;
}

interface AuthContextType {
  merchant: Merchant | null;
  token: string | null;
  loading: boolean;
  signOut: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  merchant: null,
  token: null,
  loading: true,
  signOut: () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem("nexpay_token");
    const storedMerchant = localStorage.getItem("nexpay_merchant");
    if (storedToken) {
      setToken(storedToken);
      setMerchant(storedMerchant ? JSON.parse(storedMerchant) : null);
    }
    setLoading(false);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem("nexpay_token");
    localStorage.removeItem("nexpay_merchant");
    setToken(null);
    setMerchant(null);
    router.push("/login");
  }, [router]);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<{ merchant: Merchant }>("/merchants/me");
      setMerchant(data.merchant);
      localStorage.setItem("nexpay_merchant", JSON.stringify(data.merchant));
    } catch {
      // ignore
    }
  }, []);

  return (
    <AuthContext.Provider value={{ merchant, token, loading, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export type { Merchant };
