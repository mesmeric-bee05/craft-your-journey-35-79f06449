

# Security Hardening and Project Enhancement Plan

## Overview
This plan addresses three areas: (1) comprehensive input sanitization across all client-side forms and search queries, (2) rate limiting on the two edge functions that currently lack it (`mpesa-stk-push` and `mpesa-callback`), and (3) modernizing those edge functions to use the shared security utilities already established in the codebase.

---

## Part 1: Client-Side Input Sanitization

Several forms currently lack Zod schema validation and rely only on basic checks like `!name.trim()`. We will add proper validation to all unprotected forms.

### 1.1 Add Zod Validation to Inventory Forms

**Files:** `src/components/inventory/AddEditProductDialog.tsx`, `AddEditSupplierDialog.tsx`, `AdjustStockDialog.tsx`

- Replace ad-hoc state-based validation with Zod schemas and `react-hook-form`
- Product form: validate name (1-100 chars), SKU (optional, max 50), prices (non-negative numbers), stock (non-negative integer), reorder level (non-negative integer)
- Supplier form: validate name (1-100 chars), contact fields (email format, phone format)
- Stock adjustment form: validate quantity (positive integer), note (optional, max 500 chars)

### 1.2 Add Zod Validation to Talent Forms

**File:** `src/components/talent/JobPostingForm.tsx`

- Add schema: title (1-200 chars), description (1-5000 chars), budget range (positive numbers), skills array validation

### 1.3 Add Zod Validation to Marketing/Calendar Form

**File:** `src/components/marketing/ContentCalendar.tsx`

- Add schema: title (1-200 chars), description (max 2000), date validation

### 1.4 Add Zod Validation to Profile Settings

**File:** `src/components/settings/ProfileSettings.tsx`

- Add schema: full_name (2-100 chars), company (max 100), phone (optional, E.164 pattern)

### 1.5 Add Zod Validation to CSAT Survey Widget

**File:** `src/components/inbox/CSATSurveyWidget.tsx`

- Validate rating (1-5 integer), feedback text (max 1000 chars)

### 1.6 Sanitize String Inputs in Hooks

Several hooks pass user text to `.trim()` but don't sanitize for LIKE patterns. The `useGlobalSearch` hook already uses `sanitizeSearchInput` -- no further hooks use raw `.ilike()` without sanitization, so this is already covered.

---

## Part 2: Rate Limiting on Edge Functions

### 2.1 Harden `mpesa-stk-push`

**File:** `supabase/functions/mpesa-stk-push/index.ts`

Current state: Uses inline CORS headers, inline auth, no rate limiting, no shared utilities.

Changes:
- Import and use `getCorsHeaders`, `secureResponse` from `_shared/security-headers.ts`
- Import and use `verifyAuth` from `_shared/auth.ts`
- Import and use `rateLimit`, `DEFAULT_LIMITS` from `_shared/rate-limiter.ts`
- Import and use `logError`, `logSecurityEvent`, `internalError`, `badRequest` from `_shared/errors.ts`
- Apply `sensitive` rate limits (5/hour per IP, 3/hour per user) since this initiates real payments
- Use `parseJsonBody` for body size limiting
- Move validation to use shared `validateInput` pattern

### 2.2 Harden `mpesa-callback`

**File:** `supabase/functions/mpesa-callback/index.ts`

Current state: Uses inline CORS headers, raw `console.log`/`console.error`, no rate limiting, creates its own Supabase client manually.

Changes:
- Import shared utilities (`getCorsHeaders`, `createServiceClient`, `logError`, `logSecurityEvent`, `badRequest`)
- Add IP-based rate limiting (30/min -- callbacks are server-to-server but we want abuse protection)
- Add Zod validation for the callback body structure
- Replace `console.log`/`console.error` with `logSecurityEvent`/`logError`
- Use `secureResponse` for consistent response formatting

---

## Part 3: Additional Security Improvements

### 3.1 Add `parseJsonBody` Size Limiting to `mpesa-stk-push`

Currently uses raw `await req.json()` with no size limit. Switch to the shared `parseJsonBody` which enforces a 1MB limit.

### 3.2 Consistent Timing-Safe Signature Verification

The `mpesa-callback` doesn't verify any signature from Safaricom. While M-Pesa's sandbox doesn't sign callbacks, we should add an optional IP allowlist or shared-secret check pattern (logged but not blocking in sandbox mode) for production readiness.

---

## Technical Details

### New Zod Schema Example (Product Form)
```typescript
const productSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required').max(100),
  sku: z.string().trim().max(50).optional().or(z.literal('')),
  category: z.enum(['fashion', 'food_beverage', 'electronics', 'beauty', 'general_merchandise', 'other']),
  buying_price: z.coerce.number().min(0, 'Must be non-negative'),
  selling_price: z.coerce.number().min(0, 'Must be non-negative'),
  current_stock: z.coerce.number().int().min(0),
  reorder_level: z.coerce.number().int().min(0),
  unit: z.string().min(1),
  supplier_id: z.string().uuid().optional().or(z.literal('')),
});
```

### Rate Limit Configuration for M-Pesa STK Push
```typescript
const rateLimitResult = rateLimit(req, user.id, {
  ...DEFAULT_LIMITS.sensitive,
  keyPrefix: 'mpesa-stk-push',
}, corsHeaders);
```

### Files Modified (Summary)
| File | Change |
|------|--------|
| `src/components/inventory/AddEditProductDialog.tsx` | Add Zod + react-hook-form validation |
| `src/components/inventory/AddEditSupplierDialog.tsx` | Add Zod validation |
| `src/components/inventory/AdjustStockDialog.tsx` | Add Zod validation |
| `src/components/talent/JobPostingForm.tsx` | Add Zod validation |
| `src/components/marketing/ContentCalendar.tsx` | Add Zod validation |
| `src/components/settings/ProfileSettings.tsx` | Add Zod validation |
| `src/components/inbox/CSATSurveyWidget.tsx` | Add Zod validation |
| `supabase/functions/mpesa-stk-push/index.ts` | Add rate limiting + shared utilities |
| `supabase/functions/mpesa-callback/index.ts` | Add rate limiting + shared utilities + Zod validation |

### No New Dependencies Required
All tools are already installed: `zod`, `@hookform/resolvers`, `react-hook-form`.

