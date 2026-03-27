

## Add Connections & Add-Ons Columns to Customer Table

Add two new built-in columns to the customer table: **Connections** (shows the number) and **Add-Ons** (shows count or names of selected add-ons).

### Changes

**1. `src/hooks/useColumnVisibility.ts`**
- Add `connections` and `selected_addons` to `COLUMN_LABELS` (e.g. "Conn." and "Add-Ons")
- Add them to `DEFAULT_COLUMN_ORDER` (after `device`)

**2. `src/components/CustomerTable.tsx`**
- Add header labels for the new columns in `HEADER_LABELS`
- Add two new `case` branches in `renderCell`:
  - `connections`: display `customer.connections` as a number
  - `selected_addons`: display comma-joined names from `customer.selected_addons`, or the count, or "-" if empty

**3. `src/components/ExportCSVButton.tsx`**
- Add `connections` and `selected_addons` entries to `COLUMN_CSV_MAP` and `ALL_COLUMN_ORDER` so they export correctly

### Technical details
- Both columns are read-only display in the table (editable via the Edit dialog)
- `selected_addons` is stored as a JSONB array of strings on the customer; we'll join them with commas for display
- No database changes needed -- columns already exist

