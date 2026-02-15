"use client";

import { useAuth } from "@/contexts/AuthContext";
import { LoginPage } from "./LoginPage";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <>{children}</>;
}
