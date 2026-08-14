import { Navigate } from "react-router-dom";

/** Legacy route — the health view now lives as a tab in admin monitoring. */
export default function AdminHealth() {
  return <Navigate to="/admin/monitoring/health" replace />;
}
