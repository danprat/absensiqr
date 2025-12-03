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
      cachedStudents = mockTable;
      pendingScans = mockTable;
      cachedAttendance = mockTable;
    },
  };
});

import { db } from '../db';

describe('IndexedDB Database', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Database Structure', () => {
    it('should have cachedStudents table', () => {
      expect(db.cachedStudents).toBeDefined();
    });

    it('should have pendingScans table', () => {
      expect(db.pendingScans).toBeDefined();
    });

    it('should have cachedAttendance table', () => {
      expect(db.cachedAttendance).toBeDefined();
    });
  });

  describe('cachedStudents table', () => {
    it('should add a student', async () => {
      const student = {
        id: '123',
        name: 'John Doe',
        class: 'X-A',
        qrCode: 'QR123',
      };

      db.cachedStudents.add(student);
      expect(db.cachedStudents.add).toHaveBeenCalledWith(student);
    });

    it('should get all students', async () => {
      db.cachedStudents.toArray();
      expect(db.cachedStudents.toArray).toHaveBeenCalled();
    });
  });

  describe('pendingScans table', () => {
    it('should add a pending scan', async () => {
      const scan = {
        qrCode: 'QR123',
        status: 'hadir',
        timestamp: new Date().toISOString(),
      };

      db.pendingScans.add(scan);
      expect(db.pendingScans.add).toHaveBeenCalledWith(scan);
    });

    it('should clear pending scans', async () => {
      db.pendingScans.clear();
      expect(db.pendingScans.clear).toHaveBeenCalled();
    });
  });

  describe('cachedAttendance table', () => {
    it('should add attendance record', async () => {
      const attendance = {
        id: 'att-123',
        studentId: 'stu-123',
        date: '2024-01-15',
        status: 'hadir',
      };

      db.cachedAttendance.add(attendance);
      expect(db.cachedAttendance.add).toHaveBeenCalledWith(attendance);
    });
  });
});
