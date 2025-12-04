import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Dexie before importing db
vi.mock('dexie', () => {
  const mockTable = {
    add: vi.fn(),
    put: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    toArray: vi.fn(),
    where: vi.fn().mockReturnThis(),
    equals: vi.fn().mockReturnThis(),
    first: vi.fn(),
    count: vi.fn(),
    clear: vi.fn(),
  };

  return {
    default: class MockDexie {
      version = vi.fn().mockReturnThis();
      stores = vi.fn().mockReturnThis();
      cached_students = mockTable;
      pending_scans = mockTable;
      cached_attendance = mockTable;
    },
  };
});

import { db } from '../db';

describe('IndexedDB Database', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Database Structure', () => {
    it('should have cached_students table', () => {
      expect(db.cached_students).toBeDefined();
    });

    it('should have pending_scans table', () => {
      expect(db.pending_scans).toBeDefined();
    });

    it('should have cached_attendance table', () => {
      expect(db.cached_attendance).toBeDefined();
    });
  });

  describe('cached_students table', () => {
    it('should add a student', async () => {
      const student = {
        id: '123',
        school_id: 'sch-123',
        name: 'John Doe',
        identifier: 'NIS123',
        class_name: 'X-A',
        qr_code: 'QR123',
        is_active: true,
        cached_at: Date.now(),
      };

      db.cached_students.add(student);
      expect(db.cached_students.add).toHaveBeenCalledWith(student);
    });

    it('should get all students', async () => {
      db.cached_students.toArray();
      expect(db.cached_students.toArray).toHaveBeenCalled();
    });
  });

  describe('pending_scans table', () => {
    it('should add a pending scan', async () => {
      const scan = {
        student_id: 'stu-123',
        school_id: 'sch-123',
        scan_time: Date.now(),
        synced: false,
        created_at: Date.now(),
      };

      db.pending_scans.add(scan);
      expect(db.pending_scans.add).toHaveBeenCalledWith(scan);
    });

    it('should clear pending scans', async () => {
      db.pending_scans.clear();
      expect(db.pending_scans.clear).toHaveBeenCalled();
    });
  });

  describe('cached_attendance table', () => {
    it('should add attendance record', async () => {
      const attendance = {
        id: 'att-123',
        student_id: 'stu-123',
        school_id: 'sch-123',
        scan_time: Date.now(),
        status: 'present' as const,
        cached_at: Date.now(),
      };

      db.cached_attendance.add(attendance);
      expect(db.cached_attendance.add).toHaveBeenCalledWith(attendance);
    });
  });
});
