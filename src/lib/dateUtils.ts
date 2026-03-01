/**
 * Check if a date string (YYYY-MM-DD) is within the next N days from today.
 * Returns true if the date is between today (inclusive) and today + days (inclusive).
 */
export function isExpiringSoon(dateStr: string | null, days: number = 7): boolean {
  if (!dateStr) return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  const target = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const future = new Date(today);
  future.setDate(future.getDate() + days);
  return target >= today && target <= future;
}
