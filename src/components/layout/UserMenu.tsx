"use client";

import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User } from "lucide-react";

export function UserMenu() {
  const { user, signOut } = useAuth();

  if (!user) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <div className="h-7 w-7 rounded-full bg-amber-400/20 flex items-center justify-center shrink-0">
        <User className="h-3.5 w-3.5 text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground truncate">{user.email}</p>
      </div>
      <button
        onClick={() => signOut()}
        className="p-1 hover:bg-accent rounded transition-colors"
        title="Sign out"
      >
        <LogOut className="h-3.5 w-3.5 text-muted-foreground hover:text-red-400" />
      </button>
    </div>
  );
}
