
# Fix: Add App Name Placeholder Support to Quick Reminder Subject

## Understanding the Issue
The Quick Reminder email feature uses a customizable subject line from Branding Settings (`reminder_subject`). However, unlike the message body which supports `{name}`, `{plan}`, and `{date}` placeholders, the subject line doesn't support an `{app_name}` placeholder to dynamically insert the user's custom app name.

## Current Behavior
- Subject line: Uses static text like "Your subscription expires soon"
- No way to include the app name dynamically in the subject

## Proposed Solution
Add support for an `{app_name}` placeholder in the reminder subject line, consistent with how other placeholders work in the message body.

## Technical Changes

### 1. Update SendEmailDialog.tsx (Quick Reminder)
**Location**: `src/components/SendEmailDialog.tsx`

Add `{app_name}` placeholder replacement to the subject line:
```typescript
// Line 156-157: Add app_name replacement
const appName = settings?.app_name || "Let's Stream";
let reminderSubject = settings?.reminder_subject || 'Your subscription expires soon';
reminderSubject = reminderSubject.replace(/\{app_name\}/g, appName);
```

Also update the preview display to show the resolved subject.

### 2. Update BrandingSettingsDialog.tsx
**Location**: `src/components/BrandingSettingsDialog.tsx`

Add `{app_name}` to the available placeholders documentation:
```
Available placeholders: {name}, {plan}, {date}, {app_name}
```

Add this note to the subject field as well since it now supports placeholders.

### 3. Update send-expiry-reminders Edge Function
**Location**: `supabase/functions/send-expiry-reminders/index.ts`

Add `{app_name}` placeholder replacement to automated reminder subjects for consistency.

## Summary of Files to Modify
1. `src/components/SendEmailDialog.tsx` - Add placeholder replacement for subject
2. `src/components/BrandingSettingsDialog.tsx` - Document the new placeholder
3. `supabase/functions/send-expiry-reminders/index.ts` - Add placeholder support to automated reminders
