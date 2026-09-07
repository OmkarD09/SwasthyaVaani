/**
 * Centralized date & timezone formatting utilities for SwasthyaVaani.
 * Ensures consistent conversion from UTC API ISO-8601 timestamps to the user's local timezone.
 */

/**
 * Safely parse a date/timestamp string or object into a valid Date in UTC context.
 * If the string lacks a timezone offset, 'Z' (UTC) is appended to prevent browser-local misinterpretation.
 */
export function parseUtcDate(input: string | Date | number | null | undefined): Date | null {
  if (input === null || input === undefined || input === '') {
    return null;
  }

  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }

  if (typeof input === 'number') {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Check if ISO string is missing timezone offset (e.g., "2026-09-06T17:15:00" or "2026-09-06 17:15:00")
    let normalized = trimmed;
    if (/^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(normalized)) {
      normalized = normalized.replace(' ', 'T') + 'Z';
    }

    const d = new Date(normalized);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/**
 * Format a UTC timestamp into the user's local time in standard 12-hour format (e.g. "10:45 pm").
 */
export function formatLocalTime(
  input: string | Date | number | null | undefined,
  fallback = '--'
): string {
  const d = parseUtcDate(input);
  if (!d) return fallback;

  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeStyle: 'short',
    }).format(d);
  } catch {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

/**
 * Format a UTC timestamp into local short date & time (e.g. "06/09/26, 10:45 pm").
 */
export function formatLocalDateTime(
  input: string | Date | number | null | undefined,
  fallback = '--'
): string {
  const d = parseUtcDate(input);
  if (!d) return fallback;

  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
}

/**
 * Format a UTC timestamp into local medium date & time (e.g. "6 Sept 2026, 10:45 pm").
 */
export function formatLocalFullDate(
  input: string | Date | number | null | undefined,
  fallback = '--'
): string {
  const d = parseUtcDate(input);
  if (!d) return fallback;

  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
}

/**
 * Checks whether a given UTC timestamp corresponds to today's date in the user's local timezone.
 */
export function isTodayLocal(input: string | Date | number | null | undefined): boolean {
  const d = parseUtcDate(input);
  if (!d) return false;

  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}
