import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authApi, setToken, clearToken, type UserData } from "@/lib/api";

type AuthState = {
  user: UserData | null;
  loading: boolean;
  login: (token: string, user: UserData) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, check if we already have a token saved and validate it
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("tradex_token") : null;
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .getMe()
      .then((res) => setUser(res.user))
      .catch(() => {
        clearToken();
      })
      .finally(() => setLoading(false));
  }, []);

  const login = (token: string, userData: UserData) => {
    setToken(token);
    setUser(userData);
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
