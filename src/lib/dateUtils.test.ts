import { describe, it, expect } from 'vitest';
import { parseUtcDate, formatLocalTime, formatLocalDateTime, formatLocalFullDate, isTodayLocal } from './dateUtils';

describe('dateUtils', () => {
  it('parses UTC string with Z correctly', () => {
    const d = parseUtcDate('2026-09-06T17:15:00Z');
    expect(d).not.toBeNull();
    expect(d?.toISOString()).toBe('2026-09-06T17:15:00.000Z');
  });

  it('parses naive ISO string without timezone as UTC', () => {
    const d = parseUtcDate('2026-09-06T17:15:00');
    expect(d).not.toBeNull();
    expect(d?.toISOString()).toBe('2026-09-06T17:15:00.000Z');
  });

  it('parses date string with space as UTC', () => {
    const d = parseUtcDate('2026-09-06 17:15:00');
    expect(d).not.toBeNull();
    expect(d?.toISOString()).toBe('2026-09-06T17:15:00.000Z');
  });

  it('returns fallback for invalid or null dates', () => {
    expect(formatLocalTime(null)).toBe('--');
    expect(formatLocalTime(undefined)).toBe('--');
    expect(formatLocalTime('')).toBe('--');
    expect(formatLocalTime('invalid-date', 'N/A')).toBe('N/A');
  });

  it('formats local time without crashing', () => {
    const timeStr = formatLocalTime('2026-09-06T17:15:00Z');
    expect(timeStr).toMatch(/\d{1,2}:\d{2}\s*(am|pm|AM|PM)/i);
  });

  it('formats local date time without crashing', () => {
    const dtStr = formatLocalDateTime('2026-09-06T17:15:00Z');
    expect(dtStr).toMatch(/\d{1,2}/);
  });

  it('calculates isTodayLocal correctly', () => {
    const now = new Date();
    expect(isTodayLocal(now.toISOString())).toBe(true);

    // Date from last year
    expect(isTodayLocal('2020-01-01T00:00:00Z')).toBe(false);
  });
});
