"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { api } from "./client";
import type { User } from "./types";

type RegisterInput = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Al montar, pregunta al servidor de Next quién es el usuario (valida la
  // cookie httpOnly contra la API). Si no hay sesión, responde 401 → user null.
  useEffect(() => {
    let active = true;
    api.auth
      .me()
      .then(({ user }) => {
        if (active) setUser(user);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function login(email: string, password: string) {
    const { user } = await api.auth.login(email, password);
    setUser(user);
    return user;
  }

  async function register(input: RegisterInput) {
    const { user } = await api.auth.register(input);
    setUser(user);
    return user;
  }

  async function logout() {
    try {
      await api.auth.logout();
    } catch {
      // ignoramos: la cookie se limpia igualmente en el servidor
    }
    setUser(null);
  }

  // Re-hidrata el usuario desde el servidor (p. ej. tras editar la cuenta).
  async function refresh() {
    try {
      const { user } = await api.auth.me();
      setUser(user);
    } catch {
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
