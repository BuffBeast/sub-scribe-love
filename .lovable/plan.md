

## Named Add-Ons Feature

Replace the numeric add-ons dropdown with user-configurable named add-ons (e.g. "Adult", "24/7 Channels") that appear as checkboxes when adding/editing customers.

### How it works

- You define your add-on types once (like you do with Device Types and Service Types)
- When adding or editing a customer, each add-on appears as a checkbox
- The number of checked add-ons feeds into the existing credit calculator automatically
- The credit formula stays the same -- the count of selected add-ons replaces the old numeric dropdown

### Changes

**1. Database: Create `addon_types` table**
- New table: `id`, `name`, `user_id`, `sort_order`, `created_at`
- Same pattern as `device_types` / `service_types`
- RLS policies for per-user isolation
- Store selected add-ons on the customer as a JSONB array column (`selected_addons text[]` or keep using `add_ons` as the count derived from selections stored in `custom_data` or a new column)
- Add `selected_addons jsonb DEFAULT '[]'` column to `customers` table to store the names of selected add-ons

**2. Hook: `useAddonTypes`**
- CRUD hook following the `useDeviceTypes` / `useServiceTypes` pattern
- Query key: `addon_types`

**3. UI: Manage Add-On Types**
- Add an "Add-Ons" management section in the same area where Device Types and Service Types are managed (likely in settings or inline)
- Add/remove named add-ons with a simple list + input

**4. Update AddCustomerDialog & EditCustomerDialog**
- Replace the numeric "Add-Ons" dropdown with checkboxes for each defined add-on type
- `add_ons` count is derived from the number of checked items
- Credit preview updates automatically

**5. Update CreditTracker pricing calculator**
- Replace the numeric add-ons dropdown with checkboxes matching the user's defined add-on types
- Credits calculation uses count of checked items

**6. Update CustomerDetailPanel (if it displays add-ons)**
- Show named add-ons instead of just a number

### Technical details

- The `customers.add_ons` integer column stays as-is for the credit formula
- A new `customers.selected_addons` JSONB column stores the array of add-on names (e.g. `["Adult", "24/7 Channels"]`)
- On save, `add_ons` is set to `selected_addons.length` automatically
- The `addon_types` table follows the exact same schema pattern as `service_types`

