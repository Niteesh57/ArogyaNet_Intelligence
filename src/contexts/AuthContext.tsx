import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { authApi } from "@/lib/api";
import { useNavigate } from "react-router-dom";

export type UserRole = "super_admin" | "hospital_admin" | "doctor" | "nurse" | "patient" | "user" | "lab_assistant";

export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  is_active?: boolean;
  is_verified?: boolean;
  image?: string;
  phone_number?: string;
  hospital_id?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  fetchUser: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchUser = useCallback(async () => {
    try {
      const token = localStorage.getItem("lh_token");
      if (!token) { setLoading(false); return; }
      const { data } = await authApi.me();
      setUser(data);
    } catch {
      localStorage.removeItem("lh_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const login = async (username: string, password: string) => {
    const { data } = await authApi.login(username, password);
    localStorage.setItem("lh_token", data.access_token);
    await fetchUser();
    navigate("/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("lh_token");
    setUser(null);
    navigate("/");
  };

  const isAdmin = user?.role === "super_admin" || user?.role === "hospital_admin";

  const updateProfile = async (data: Partial<User>) => {
    // Optimistic update or just re-fetch
    await fetchUser();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, fetchUser, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
