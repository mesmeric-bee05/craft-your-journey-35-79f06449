

# SmartReach AI - Prompt 1: Inventory Intelligence Module

## Overview

The uploaded document contains 12 sequential build prompts for completing SmartReach AI. Following the prescribed build order, this plan implements **Prompt 1: Inventory Intelligence Module** -- the highest priority feature that is currently 0% built. This is the fastest module to build and the most immediately valuable for Kenyan MSME traders.

Additionally, the persistent **SLA Settings blank page bug** will be definitively fixed.

---

## Part A: Fix SLA Settings Blank Page (Critical Bug)

The SLA Settings component currently shows a blank page. The root cause is a timing issue between `useBusiness` and `useSLAPolicies` hooks where the combined loading state resolves but business may still be null in certain edge cases.

**Fix approach:**
- Add a guard in `useSLAPolicies` to not set `loading: false` until `businessLoading` is definitively `false`
- Ensure the `fetchPolicies` callback does not run prematurely when business is still loading
- Add an explicit `useEffect` dependency on `businessLoading` to re-evaluate when business state settles

**Files to edit:**
- `src/hooks/useSLAPolicies.tsx` -- fix loading state synchronization

---

## Part B: Inventory Intelligence Module

### Database Tables (Migration)

Create 3 new tables:

1. **`products`** -- id, business_id, name, sku, category (enum: Fashion, Food & Beverage, Electronics, Beauty, General Merchandise, Other), buying_price, selling_price, current_stock, reorder_level, unit (pieces/kgs/litres/metres), supplier_id (nullable FK), image_url, is_active, created_at, updated_at

2. **`suppliers`** -- id, business_id, name, phone, email, product_categories (text array), notes, created_at, updated_at

3. **`stock_movements`** -- id, product_id, business_id, movement_type (enum: sale, restock, adjustment, loss), quantity_change, previous_stock, new_stock, note, created_by, created_at

All tables with RLS policies scoped to `is_business_member(auth.uid(), business_id)`.

### Navigation Update

**File:** `src/components/layout/DashboardLayout.tsx`
- Add "Inventory" nav item with `Package` icon between "Talent Hub" and "Payments"

### Routing

**File:** `src/App.tsx`
- Add `/inventory` route with RequireAuth + RequireOnboarding wrappers

### New Page

**File:** `src/pages/Inventory.tsx`
- Page header: "Inventory Intelligence" with subtitle
- 4 KPI cards: Total Products, Total Stock Value (KES), Low Stock Alerts, Stockout Products
- 4 tabs: Products, Low Stock Alerts, Stock Movements, Suppliers

### Tab 1 -- Products

Searchable table with columns: Product Name, SKU, Category (badge), Stock (red if below reorder), Reorder Level, Buying Price (KES), Selling Price (KES), Margin %, Supplier, Actions. Row highlighted red when stock is at or below reorder level. "+ Add Product" button top right.

### Tab 2 -- Low Stock Alerts

Cards for products where `current_stock <= reorder_level`. Each card shows product name, stock level (large red number), reorder level, supplier info, "Send Reorder WhatsApp" button (opens wa.me link), and "Send SMS" button.

### Tab 3 -- Stock Movements

Timeline of all stock changes with color-coded badges. Filterable by movement type and date range.

### Tab 4 -- Suppliers

Supplier cards with CRUD operations. Name, phone, categories, notes.

### Modals

1. **Add/Edit Product Modal** -- all product fields, auto-calculated margin, supplier dropdown
2. **Adjust Stock Modal** -- current stock display, quantity change input, movement type, reason field. Updates both `products.current_stock` and inserts into `stock_movements`.

### Hooks

**File:** `src/hooks/useProducts.tsx` -- CRUD for products with real-time stock calculations
**File:** `src/hooks/useSuppliers.tsx` -- CRUD for suppliers
**File:** `src/hooks/useStockMovements.tsx` -- stock movement logging and retrieval

### Components

```text
src/
  pages/
    Inventory.tsx
  components/
    inventory/
      ProductsTab.tsx
      ProductTable.tsx
      AddEditProductDialog.tsx
      AdjustStockDialog.tsx
      LowStockAlerts.tsx
      StockMovementsTab.tsx
      SuppliersTab.tsx
      SupplierCard.tsx
      AddEditSupplierDialog.tsx
      InventoryKPICards.tsx
  hooks/
    useProducts.tsx
    useSuppliers.tsx
    useStockMovements.tsx
```

### Automated Alerts

When a stock adjustment causes `current_stock <= reorder_level`, trigger a toast notification: "Low Stock Alert: [Product Name] has only [X] units remaining."

### Mobile Optimization

Product cards in mobile view show large "+ Add Stock" and "- Record Sale" buttons for rapid one-tap updates.

### Styling

- Orange accent (#E85D04) for primary actions
- Red (#DC2626) for stock alerts and low stock indicators
- Green (#16A34A) for positive stock movements
- Fully responsive, mobile-first layout

### Empty State

If no products exist, show illustration with "Your inventory is empty" message and prominent "+ Add Your First Product" button.

---

## Implementation Sequence

1. Fix SLA Settings loading bug
2. Run database migration for products, suppliers, stock_movements
3. Create hooks (useProducts, useSuppliers, useStockMovements)
4. Build inventory components (dialogs, tabs, cards)
5. Create Inventory page with all tabs
6. Add navigation and routing
7. Test end-to-end

---

## What Comes Next (Future Prompts)

After this implementation, the next prompts in order are:
- Prompt 2: M-Pesa Auto-Reconciliation Engine
- Prompt 3: WhatsApp Business API Integration
- Prompt 4: Swahili/Sheng' AI Content Generator
- Prompt 5: SmartReach Score
- Prompts 6-12: Onboarding, ODPC, PWA, Analytics, Social Publishing, Talent Hub, Dashboard

Each will be implemented sequentially in subsequent sessions.

