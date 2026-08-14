import { Navigate } from "react-router-dom";

/** Legacy route — the SEO monitor now lives as a tab in admin monitoring. */
export default function AdminSEO() {
  return <Navigate to="/admin/monitoring/seo" replace />;
}
