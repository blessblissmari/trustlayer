import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading, configured } = useAuth();
  const location = useLocation();

  // If auth isn't configured in this build (e.g. open-source self-host without
  // SUPABASE env vars), fail open — the user can still use the analyze flow.
  if (!configured) return <>{children}</>;

  if (loading) {
    return (
      <main className="app__main">
        <p className="muted">…</p>
      </main>
    );
  }

  if (!user) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return <>{children}</>;
}
