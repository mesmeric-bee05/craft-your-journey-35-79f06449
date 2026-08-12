import { Navigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";

/**
 * Gate for admin-only pages. Signed-out visitors go to /auth; signed-in
 * non-admins see a clear message instead of a silent redirect, and the role
 * lookup renders a skeleton rather than a blank screen.
 */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isAdmin, isResolved } = useIsAdmin();

  if (loading || (user && !isResolved)) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-72" />
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (!isAdmin) {
    return (
      <Card className="max-w-lg mx-auto mt-10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldAlert className="h-5 w-5 text-amber-500" aria-hidden="true" />
            Admin access required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            This page shows platform-wide operations data, so it is limited to SmartReach
            administrators. Ask your workspace owner to grant you the admin role if you need access.
          </p>
          <Button asChild variant="outline">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
