
# Fix Business Asset Upload Storage Policies

## Problem Identified

The storage RLS policies for the `business-assets` bucket have a **bug in the SQL syntax**. The policies incorrectly reference `b.name` (the business name column) instead of `name` (the storage object's file path).

**Current (Broken)**:
```sql
WHERE storage.foldername(b.name)[1] = b.id::text
```

This checks if the first folder in the **business name** (e.g., "My Company") equals the business ID - which will never be true.

**Required (Fixed)**:
```sql
WHERE storage.foldername(name)[1] = b.id::text
```

This correctly checks if the first folder in the **file path** (e.g., "abc123-uuid/logo.png") matches the business ID.

---

## Implementation Plan

### Step 1: Drop and Recreate Storage Policies

Create a database migration that:

1. **Drops** all four existing business-assets policies:
   - `Business members can upload to their business paths` (INSERT)
   - `Business members can view their business assets` (SELECT)
   - `Business members can update their business assets` (UPDATE)
   - `Business members can delete their business assets` (DELETE)

2. **Recreates** them with the correct syntax using `storage.foldername(name)` instead of `storage.foldername(b.name)`

---

## Technical Details

### Fixed INSERT Policy
```sql
CREATE POLICY "Business members can upload to their business paths"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business-assets'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE (storage.foldername(name))[1] = b.id::text
    AND (b.owner_id = auth.uid() OR public.is_business_member(auth.uid(), b.id))
  )
);
```

### Fixed SELECT Policy
```sql
CREATE POLICY "Business members can view their business assets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'business-assets'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE (storage.foldername(name))[1] = b.id::text
    AND (b.owner_id = auth.uid() OR public.is_business_member(auth.uid(), b.id))
  )
);
```

### Fixed UPDATE Policy
```sql
CREATE POLICY "Business members can update their business assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'business-assets'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE (storage.foldername(name))[1] = b.id::text
    AND (b.owner_id = auth.uid() OR public.is_business_member(auth.uid(), b.id))
  )
);
```

### Fixed DELETE Policy
```sql
CREATE POLICY "Business members can delete their business assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'business-assets'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE (storage.foldername(name))[1] = b.id::text
    AND (b.owner_id = auth.uid() OR public.is_business_member(auth.uid(), b.id))
  )
);
```

---

## Files to Modify

| File | Change |
|------|--------|
| New migration file | Drop and recreate all 4 storage policies with correct `name` reference |

---

## Testing After Fix

1. Complete Step 1 (Business Details) of onboarding
2. Proceed to Step 2 (Branding)
3. Upload a logo image - should succeed
4. Upload a cover image - should succeed
5. Verify images display correctly in the preview

---

## Root Cause

The original migration file had the correct SQL, but during deployment the policies were applied incorrectly (possibly a copy-paste error or parsing issue that caused `name` to be interpreted as `b.name`).
