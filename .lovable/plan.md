

## Low Credit Balance Warning

Add a configurable threshold so a warning banner appears on the Credits card when the balance drops below it. The threshold is stored in `app_settings`.

### Changes

**1. Database: Add `credit_warning_threshold` to `app_settings`**
- Migration: `ALTER TABLE app_settings ADD COLUMN credit_warning_threshold numeric(10,1) DEFAULT 5;`
- No new RLS needed (existing policies cover it)

**2. `src/hooks/useAppSettings.ts`**
- Add `credit_warning_threshold` to the `AppSettings` interface
- Add it as an accepted field in `useUpdateAppSettings`

**3. `src/components/CreditTracker.tsx`**
- Read `useAppSettings()` to get the threshold (default 5)
- When `balance <= threshold && balance > 0`, show an amber warning bar below the balance line: "Low credit balance -- only X credits remaining"
- When `balance <= 0`, show a red warning
- Add a small input in the collapsible section to configure the threshold (saves via `useUpdateAppSettings`)

### Technical details
- Threshold defaults to 5 credits
- Warning shows on the collapsed card header (always visible) so users see it without opening the tracker
- Configurable inline within the Credits card -- no separate settings page needed

