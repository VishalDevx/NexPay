"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getAdminToken, setAdminToken, clearAdminToken, adminFetch } from "./admin-api";

interface AdminAuthContextType {
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  token: null,
  loading: true,
  signIn: async () => {},
  signOut: () => {},
});

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setToken(getAdminToken());
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    const API = process.env.NEXT_PUBLIC_API_URL;
    const res = await fetch(`${API}/api/v1/merchants/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    setAdminToken(data.token);
    setToken(data.token);
    router.push("/health");
  };

  const signOut = () => {
    clearAdminToken();
    setToken(null);
    router.push("/login");
  };

  return (
    <AdminAuthContext.Provider value={{ token, loading, signIn, signOut }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}

export { adminFetch };
