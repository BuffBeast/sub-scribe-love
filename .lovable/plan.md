
# Add "Expiring Soon" Visual Warning Indicator

## Overview
Add a visual warning for customers whose LIVE or VOD subscriptions expire within the next 7 days. This will appear as an "Expiring Soon" status badge and highlighted expiry dates in both the desktop table and mobile card views.

## Changes

### 1. Create a helper utility function
Add a shared helper `isExpiringSoon(dateStr, days)` that checks if a date string is within N days from today. This will be used across components to keep logic consistent.

**File:** `src/lib/dateUtils.ts` (new file)

### 2. Update StatusBadge component
- Add a new `"expiring"` status type to `SubscriptionStatus` in `src/types/customer.ts`
- Add an "Expiring Soon" entry to the `statusConfig` in `StatusBadge.tsx` with an amber/orange warning style (pulsing border for attention)

### 3. Update the auto-expiry logic in useCustomers hook
- Before returning customer data, compute an effective display status: if a customer is "active" and any of their active subscriptions expire within 7 days, the display status becomes `"expiring"`
- This is purely a display-level enrichment -- no database changes

### 4. Highlight expiry dates in CustomerTable
- In the `subscription_end_date` and `vod_end_date` cells, add amber/warning text color and a small warning icon (AlertTriangle from lucide) when the date is within 7 days
- Same treatment in `MobileCustomerCard.tsx` for the expiry date buttons

## Technical Details

**New file: `src/lib/dateUtils.ts`**
- `isExpiringSoon(dateStr: string | null, days: number = 7): boolean` -- parses date locally and checks if it's between today and today + N days

**`src/types/customer.ts`** -- Add `'expiring'` to `SubscriptionStatus` union type

**`src/components/StatusBadge.tsx`** -- Add expiring config:
- Style: `bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse` 
- Label: "Expiring Soon"

**`src/components/CustomerTable.tsx`** -- In `renderCell` for `subscription_end_date` and `vod_end_date`:
- Import `isExpiringSoon` and `AlertTriangle` icon
- Add warning color class and icon when expiring soon

**`src/components/MobileCustomerCard.tsx`** -- Same warning treatment on the expiry date buttons

**`src/hooks/useCustomers.ts`** or display logic -- When rendering the StatusBadge, compute the effective status: if `subscription_status === 'active'` and either LIVE or VOD end date is expiring soon, pass `"expiring"` to the StatusBadge instead. This keeps the database value unchanged.

No database changes required. No new dependencies needed.
