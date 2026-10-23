"use client";

import { QueryCache, QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { createContext, useContext, useState } from "react";
import { ApiError, adminFetch } from "@/lib/admin/api";
import type { AdminMe } from "@/lib/admin/types";

type AuthState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "error"; retry: () => void }
  | { status: "authed"; admin: AdminMe };

const AuthContext = createContext<AuthState>({ status: "loading" });

export const useAdminAuth = () => useContext(AuthContext);

function AuthGate({ children }: { children: React.ReactNode }) {
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => adminFetch<AdminMe>("/api/admin/auth/me"),
    retry: false,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  let state: AuthState;
  if (me.isPending) {
    state = { status: "loading" };
  } else if (me.isError) {
    state =
      me.error instanceof ApiError && me.error.status === 401
        ? { status: "anonymous" }
        : { status: "error", retry: () => void me.refetch() };
  } else {
    state = { status: "authed", admin: me.data };
  }

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export default function AdminProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error, query) => {
            // the session ended (expired, password changed, signed out elsewhere): back to the login page
            if (
              error instanceof ApiError &&
              error.status === 401 &&
              query.queryKey[0] !== "me" &&
              !window.location.pathname.startsWith("/admin/login")
            ) {
              window.location.assign("/admin/login");
            }
          },
        }),
        defaultOptions: { queries: { retry: 1, staleTime: 15_000, refetchOnWindowFocus: true } },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <AuthGate>{children}</AuthGate>
    </QueryClientProvider>
  );
}