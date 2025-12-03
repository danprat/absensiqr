import Dexie, { type EntityTable } from 'dexie'

// Type definitions for database tables
export interface CachedStudent {
  id: string
  school_id: string
  name: string
  identifier: string
  class_name?: string
  qr_code?: string
  is_active: boolean
  cached_at: number
}

export interface PendingScan {
  id?: number
  student_id: string
  school_id: string
  scan_time: number
  location?: string
  notes?: string
  synced: boolean
  created_at: number
}

export interface CachedAttendance {
  id: string
  student_id: string
  school_id: string
  scan_time: number
  status: 'present' | 'late' | 'absent'
  location?: string
  notes?: string
  cached_at: number
}

// Define the database
const db = new Dexie('AbsensiQRDB') as Dexie & {
  cached_students: EntityTable<CachedStudent, 'id'>
  pending_scans: EntityTable<PendingScan, 'id'>
  cached_attendance: EntityTable<CachedAttendance, 'id'>
}

// Define schema
db.version(1).stores({
  cached_students: 'id, school_id, identifier, name, is_active, cached_at',
  pending_scans: '++id, student_id, school_id, scan_time, synced, created_at',
  cached_attendance: 'id, student_id, school_id, scan_time, status, cached_at',
})

export { db }

// Helper functions for common operations
export const dbHelpers = {
  // Student cache operations
  async cacheStudent(student: Omit<CachedStudent, 'cached_at'>) {
    const cached: CachedStudent = {
      ...student,
      cached_at: Date.now(),
    }
    await db.cached_students.put(cached)
  },

  async getCachedStudent(id: string): Promise<CachedStudent | undefined> {
    return await db.cached_students.get(id)
  },

  async getCachedStudentsBySchool(school_id: string): Promise<CachedStudent[]> {
    return await db.cached_students
      .where('school_id')
      .equals(school_id)
      .and(s => s.is_active)
      .toArray()
  },

  async clearStudentCache(school_id?: string) {
    if (school_id) {
      await db.cached_students.where('school_id').equals(school_id).delete()
    } else {
      await db.cached_students.clear()
    }
  },

  // Pending scan operations
  async addPendingScan(scan: Omit<PendingScan, 'id' | 'synced' | 'created_at'>) {
    const pending: Omit<PendingScan, 'id'> = {
      ...scan,
      synced: false,
      created_at: Date.now(),
    }
    return await db.pending_scans.add(pending)
  },

  async getPendingScans(): Promise<PendingScan[]> {
    return await db.pending_scans.where('synced').equals(0).toArray()
  },

  async markScanAsSynced(id: number) {
    await db.pending_scans.update(id, { synced: true })
  },

  async clearSyncedScans() {
    await db.pending_scans.where('synced').equals(1).delete()
  },

  // Attendance cache operations
  async cacheAttendance(attendance: Omit<CachedAttendance, 'cached_at'>) {
    const cached: CachedAttendance = {
      ...attendance,
      cached_at: Date.now(),
    }
    await db.cached_attendance.put(cached)
  },

  async getCachedAttendanceByDate(
    school_id: string,
    startDate: number,
    endDate: number
  ): Promise<CachedAttendance[]> {
    return await db.cached_attendance
      .where('school_id')
      .equals(school_id)
      .and(a => a.scan_time >= startDate && a.scan_time <= endDate)
      .toArray()
  },

  async clearAttendanceCache(school_id?: string) {
    if (school_id) {
      await db.cached_attendance.where('school_id').equals(school_id).delete()
    } else {
      await db.cached_attendance.clear()
    }
  },

  // Clear all data
  async clearAllData() {
    await db.cached_students.clear()
    await db.pending_scans.clear()
    await db.cached_attendance.clear()
  },
}
