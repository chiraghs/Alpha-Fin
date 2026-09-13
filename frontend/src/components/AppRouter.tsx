"use client";

// Picks the cockpit that matches the signed-in role: Relationship Managers get
// the lead-generation hub + customer simulator; Branch Managers get the team
// monitoring cockpit. Auth is re-checked inside each dashboard too.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, Session } from "@/lib/auth";
import { Dashboard } from "./Dashboard";
import { ManagerDashboard } from "./ManagerDashboard";

export function AppRouter() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      router.replace("/login");
    } else {
      setSession(s);
    }
    setReady(true);
  }, [router]);

  if (!ready || !session) {
    return (
      <div className="app-mesh flex min-h-screen items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand border-t-transparent" aria-label="Loading" />
      </div>
    );
  }

  return session.role === "Branch Manager" ? <ManagerDashboard /> : <Dashboard />;
}
