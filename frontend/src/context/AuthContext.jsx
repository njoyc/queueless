import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadUser() {
    const token = localStorage.getItem("access_token");

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get("/auth/me");
      setUser(response.data);
    } catch {
      localStorage.removeItem("access_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUser();
  }, []);

  function logout() {
    localStorage.removeItem("access_token");
    setUser(null);
  }

  return (
  <AuthContext.Provider value={{ user, loading, logout, loadUser }}>
    {children}
  </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}