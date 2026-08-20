import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("mc_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const boot = async () => {
      if (token) {
        try {
          const res = await api.get("/auth/me");
          setUser(res.data);
        } catch {
          localStorage.removeItem("mc_token");
          setToken(null);
        }
      }
      setLoading(false);
    };
    boot();
    // eslint-disable-next-line
  }, []);

  const login = (newToken, newUser) => {
    localStorage.setItem("mc_token", newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem("mc_token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
