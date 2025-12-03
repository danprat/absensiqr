/**
 * Timezone Utilities Test Suite
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  TIMEZONES,
  getTimezoneIdentifier,
  getSchoolLocalTime,
  formatInSchoolTimezone,
  isWithinSchoolHours,
  getTimezoneOffset,
  validateSchoolHours,
  getSchoolDate,
  type SchoolHours,
  type TimezoneType,
} from '../timezone';

describe('Timezone Utilities', () => {
  describe('TIMEZONES constant', () => {
    it('should define Indonesian timezones', () => {
      expect(TIMEZONES.WIB).toBe('Asia/Jakarta');
      expect(TIMEZONES.WITA).toBe('Asia/Makassar');
      expect(TIMEZONES.WIT).toBe('Asia/Jayapura');
    });

    it('should have exactly 3 timezone definitions', () => {
      expect(Object.keys(TIMEZONES)).toHaveLength(3);
    });
  });

  describe('getTimezoneIdentifier', () => {
    it('should return correct IANA identifier for WIB', () => {
      const tz = getTimezoneIdentifier('WIB');
      expect(tz).toBe('Asia/Jakarta');
    });

    it('should return correct IANA identifier for WITA', () => {
      const tz = getTimezoneIdentifier('WITA');
      expect(tz).toBe('Asia/Makassar');
    });

    it('should return correct IANA identifier for WIT', () => {
      const tz = getTimezoneIdentifier('WIT');
      expect(tz).toBe('Asia/Jayapura');
    });
  });

  describe('getTimezoneOffset', () => {
    it('should return correct offset for WIB', () => {
      expect(getTimezoneOffset('WIB')).toBe(7);
    });

    it('should return correct offset for WITA', () => {
      expect(getTimezoneOffset('WITA')).toBe(8);
    });

    it('should return correct offset for WIT', () => {
      expect(getTimezoneOffset('WIT')).toBe(9);
    });
  });

  describe('getSchoolLocalTime', () => {
    it('should return a Date object', () => {
      const time = getSchoolLocalTime('WIB');
      expect(time).toBeInstanceOf(Date);
    });

    it('should return different times for different timezones', () => {
      const wibTime = getSchoolLocalTime('WIB');
      const witaTime = getSchoolLocalTime('WITA');
      const witTime = getSchoolLocalTime('WIT');

      // Times should be different (approximately 1-2 hours apart)
      const wibHour = wibTime.getHours();
      const witaHour = witaTime.getHours();
      const witHour = witTime.getHours();

      // WITA should be 1 hour ahead of WIB
      // WIT should be 2 hours ahead of WIB
      expect(witaHour).toBeGreaterThanOrEqual((wibHour + 1) % 24);
      expect(witHour).toBeGreaterThanOrEqual((wibHour + 2) % 24);
    });

    it('should return valid date components', () => {
      const time = getSchoolLocalTime('WIB');

      expect(time.getFullYear()).toBeGreaterThan(2000);
      expect(time.getMonth()).toBeGreaterThanOrEqual(0);
      expect(time.getMonth()).toBeLessThan(12);
      expect(time.getDate()).toBeGreaterThan(0);
      expect(time.getDate()).toBeLessThanOrEqual(31);
      expect(time.getHours()).toBeGreaterThanOrEqual(0);
      expect(time.getHours()).toBeLessThan(24);
    });
  });

  describe('formatInSchoolTimezone', () => {
    const testDate = new Date('2024-12-03T14:30:00Z'); // Fixed date for testing

    it('should format date correctly', () => {
      const formatted = formatInSchoolTimezone(testDate, 'WIB', 'date');
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should format time correctly', () => {
      const formatted = formatInSchoolTimezone(testDate, 'WIB', 'time');
      expect(formatted).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    it('should format datetime correctly', () => {
      const formatted = formatInSchoolTimezone(testDate, 'WIB', 'datetime');
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it('should format ISO correctly', () => {
      const formatted = formatInSchoolTimezone(testDate, 'WIB', 'iso');
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    });

    it('should default to datetime format', () => {
      const formatted = formatInSchoolTimezone(testDate, 'WIB');
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it('should handle different timezones', () => {
      const wibFormatted = formatInSchoolTimezone(testDate, 'WIB', 'time');
      const witaFormatted = formatInSchoolTimezone(testDate, 'WITA', 'time');
      const witFormatted = formatInSchoolTimezone(testDate, 'WIT', 'time');

      // All should be valid time formats
      expect(wibFormatted).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      expect(witaFormatted).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      expect(witFormatted).toMatch(/^\d{2}:\d{2}:\d{2}$/);

      // They should be different (1-2 hours apart)
      expect(wibFormatted).not.toBe(witaFormatted);
      expect(wibFormatted).not.toBe(witFormatted);
    });
  });

  describe('getSchoolDate', () => {
    it('should return date in YYYY-MM-DD format', () => {
      const date = getSchoolDate('WIB');
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return valid date', () => {
      const dateStr = getSchoolDate('WIB');
      const [year, month, day] = dateStr.split('-').map(Number);

      expect(year).toBeGreaterThan(2000);
      expect(month).toBeGreaterThanOrEqual(1);
      expect(month).toBeLessThanOrEqual(12);
      expect(day).toBeGreaterThan(0);
      expect(day).toBeLessThanOrEqual(31);
    });

    it('should handle different timezones', () => {
      const wibDate = getSchoolDate('WIB');
      const witaDate = getSchoolDate('WITA');
      const witDate = getSchoolDate('WIT');

      // All should be valid dates
      expect(wibDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(witaDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(witDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Dates could be same or differ by 1 day depending on time
      // Just verify they're all valid
      expect(new Date(wibDate)).toBeInstanceOf(Date);
      expect(new Date(witaDate)).toBeInstanceOf(Date);
      expect(new Date(witDate)).toBeInstanceOf(Date);
    });
  });

  describe('validateSchoolHours', () => {
    it('should validate correct school hours', () => {
      const schoolHours: SchoolHours = {
        monday: { start: '07:00', end: '15:00' },
        tuesday: { start: '07:00', end: '15:00' },
      };

      const result = validateSchoolHours(schoolHours);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept time format with or without leading zero', () => {
      const schoolHours: SchoolHours = {
        monday: { start: '7:00', end: '15:00' }, // Single digit hour is valid per regex
        tuesday: { start: '07:00', end: '15:00' }, // Leading zero is also valid
      };

      const result = validateSchoolHours(schoolHours);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject when start time is after end time', () => {
      const schoolHours: SchoolHours = {
        monday: { start: '15:00', end: '07:00' },
      };

      const result = validateSchoolHours(schoolHours);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Start time must be before end time for monday');
    });

    it('should reject when start equals end time', () => {
      const schoolHours: SchoolHours = {
        monday: { start: '08:00', end: '08:00' },
      };

      const result = validateSchoolHours(schoolHours);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Start time must be before end time for monday');
    });

    it('should handle multiple invalid days', () => {
      const schoolHours: SchoolHours = {
        monday: { start: '25:00', end: '15:00' }, // Invalid hour
        tuesday: { start: '07:00', end: '06:00' }, // End before start
      };

      const result = validateSchoolHours(schoolHours);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should accept empty school hours', () => {
      const result = validateSchoolHours({});
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle all days of week', () => {
      const schoolHours: SchoolHours = {
        monday: { start: '07:00', end: '15:00' },
        tuesday: { start: '07:00', end: '15:00' },
        wednesday: { start: '07:00', end: '15:00' },
        thursday: { start: '07:00', end: '15:00' },
        friday: { start: '07:00', end: '14:00' },
        saturday: { start: '08:00', end: '12:00' },
      };

      const result = validateSchoolHours(schoolHours);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate edge times', () => {
      const schoolHours: SchoolHours = {
        monday: { start: '00:00', end: '23:59' },
      };

      const result = validateSchoolHours(schoolHours);
      expect(result.valid).toBe(true);
    });
  });

  describe('isWithinSchoolHours', () => {
    const schoolHours: SchoolHours = {
      monday: { start: '07:00', end: '15:00' },
      tuesday: { start: '07:00', end: '15:00' },
      wednesday: { start: '07:00', end: '15:00' },
    };

    it('should return true when within school hours', () => {
      // Monday 10:00
      const testTime = new Date(2024, 11, 2, 10, 0, 0); // Month is 0-indexed, Dec 2, 2024 is Monday

      const result = isWithinSchoolHours('WIB', schoolHours, testTime);
      expect(result.isWithinHours).toBe(true);
      expect(result.daySchedule).toBeDefined();
    });

    it('should return false when before school hours', () => {
      // Monday 06:00
      const testTime = new Date(2024, 11, 2, 6, 0, 0);

      const result = isWithinSchoolHours('WIB', schoolHours, testTime);
      expect(result.isWithinHours).toBe(false);
    });

    it('should return false when after school hours', () => {
      // Monday 16:00
      const testTime = new Date(2024, 11, 2, 16, 0, 0);

      const result = isWithinSchoolHours('WIB', schoolHours, testTime);
      expect(result.isWithinHours).toBe(false);
    });

    it('should return false when no schedule for day', () => {
      // Sunday (no schedule)
      const testTime = new Date(2024, 11, 1, 10, 0, 0); // Dec 1, 2024 is Sunday

      const result = isWithinSchoolHours('WIB', schoolHours, testTime);
      expect(result.isWithinHours).toBe(false);
      expect(result.daySchedule).toBeNull();
      expect(result.dayName).toBe('sunday');
    });

    it('should handle boundary conditions - start time', () => {
      // Monday 07:00 (exact start time)
      const testTime = new Date(2024, 11, 2, 7, 0, 0);

      const result = isWithinSchoolHours('WIB', schoolHours, testTime);
      expect(result.isWithinHours).toBe(true);
    });

    it('should handle boundary conditions - end time', () => {
      // Monday 15:00 (exact end time)
      const testTime = new Date(2024, 11, 2, 15, 0, 0);

      const result = isWithinSchoolHours('WIB', schoolHours, testTime);
      expect(result.isWithinHours).toBe(true);
    });

    it('should return current time string', () => {
      const testTime = new Date(2024, 11, 2, 10, 30, 0);

      const result = isWithinSchoolHours('WIB', schoolHours, testTime);
      expect(result.currentTimeStr).toBe('10:30');
    });

    it('should return correct day name', () => {
      const monday = new Date(2024, 11, 2, 10, 0, 0); // Dec 2, 2024
      const tuesday = new Date(2024, 11, 3, 10, 0, 0); // Dec 3, 2024

      const result1 = isWithinSchoolHours('WIB', schoolHours, monday);
      expect(result1.dayName).toBe('monday');

      const result2 = isWithinSchoolHours('WIB', schoolHours, tuesday);
      expect(result2.dayName).toBe('tuesday');
    });

    it('should use current time when not provided', () => {
      const result = isWithinSchoolHours('WIB', schoolHours);

      expect(result).toBeDefined();
      expect(result.currentTimeStr).toMatch(/^\d{2}:\d{2}$/);
      expect(result.dayName).toBeDefined();
    });

    it('should handle different school hours per day', () => {
      const customHours: SchoolHours = {
        monday: { start: '07:00', end: '15:00' },
        friday: { start: '07:00', end: '11:30' }, // Half day Friday
      };

      // Friday 14:00 - should be outside hours
      const friday = new Date(2024, 11, 6, 14, 0, 0); // Dec 6, 2024 is Friday
      const result = isWithinSchoolHours('WIB', customHours, friday);

      expect(result.isWithinHours).toBe(false);
      expect(result.daySchedule?.end).toBe('11:30');
    });
  });

  describe('Timezone Integration', () => {
    it('should maintain consistency across timezone functions', () => {
      const timezone: TimezoneType = 'WIB';
      const now = new Date();

      // Get time in timezone
      const localTime = getSchoolLocalTime(timezone);

      // Format it
      const formatted = formatInSchoolTimezone(localTime, timezone, 'datetime');

      // Should be valid format
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it('should handle all Indonesian timezones consistently', () => {
      const timezones: TimezoneType[] = ['WIB', 'WITA', 'WIT'];

      timezones.forEach((tz) => {
        const time = getSchoolLocalTime(tz);
        expect(time).toBeInstanceOf(Date);

        const formatted = formatInSchoolTimezone(time, tz, 'datetime');
        expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);

        const offset = getTimezoneOffset(tz);
        expect(offset).toBeGreaterThanOrEqual(7);
        expect(offset).toBeLessThanOrEqual(9);
      });
    });
  });
});
