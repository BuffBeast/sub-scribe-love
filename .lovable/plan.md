

# Fix Import/Export and Column Visibility Issues

## Three Problems Identified

1. **CSV import fails when columns are in different order** — The import already uses header-based matching (`findValue` does case-insensitive partial matching), but it's fragile. The real issue is that when headers don't exactly match expected patterns, data gets missed silently.

2. **Can't retry import after errors without logging out** — After a failed import, the dialog state (parsed data, errors) doesn't reset when reopening, and the file input retains the old file reference, blocking re-upload.

3. **Column visibility toggle doesn't hide columns** — The `useUpdateColumnOrder` mutation (line 168 of `useColumnVisibility.ts`) hard-codes `is_visible: true` for every column during upsert. So any drag-reorder operation resets all hidden columns back to visible.

---

## Plan

### Fix 1: Column Visibility Bug (root cause)
**File:** `src/hooks/useColumnVisibility.ts`
- In `useUpdateColumnOrder`, change the upsert to preserve existing `is_visible` state instead of forcing `true`. Pass the current visibility from `orderedColumns` data into the mutation, or only upsert the `sort_order` field without touching `is_visible`.

### Fix 2: Import Retry Without Logout
**File:** `src/components/ImportCustomersDialog.tsx`
- Reset all state (`parsedData`, `columns`, `validationErrors`, file input value) when the dialog opens, not just when it closes.
- After validation errors, keep the parsed data visible but allow the user to click the upload area again to pick a new file (clear the file input ref).
- Add a "Clear / Try Again" button next to the error display that resets state so user can re-upload.

### Fix 3: More Robust CSV Column Mapping
**File:** `src/components/ImportCustomersDialog.tsx`
- Improve the `findValue` function's header matching to handle more variations (e.g., "Customer Name" → name, "Subscription Plan" → subscription_plan).
- Add a header mapping step that normalizes CSV headers before matching, so column order is irrelevant (this already mostly works, but needs better alias coverage).
- Show a mapping preview so users can see which CSV columns mapped to which fields before importing.

### Summary of File Changes
| File | Change |
|------|--------|
| `src/hooks/useColumnVisibility.ts` | Fix `useUpdateColumnOrder` to preserve `is_visible` |
| `src/components/ImportCustomersDialog.tsx` | Reset state on dialog open; add retry button; improve header matching |

