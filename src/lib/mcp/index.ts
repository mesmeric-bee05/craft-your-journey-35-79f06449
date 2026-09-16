import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listCustomersTool from "./tools/list-customers";
import listProductsTool from "./tools/list-products";
import getBusinessHealthTool from "./tools/get-business-health";
import createCustomerTool from "./tools/create-customer";

// The OAuth issuer must be the direct Supabase host, built from the project ref
// (inlined by Vite at build time so this file stays import-safe).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "smartreach-ai",
  title: "SmartReach AI",
  version: "0.1.0",
  instructions:
    "Tools for a SmartReach AI business account. Use list_customers and list_products to read the signed-in owner's CRM and inventory, get_business_health for their SmartReach score, and create_customer to add a customer. All data is scoped to the signed-in user's business.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listCustomersTool, listProductsTool, getBusinessHealthTool, createCustomerTool],
});
