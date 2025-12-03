/**
 * QR Code Utilities Test Suite
 */

import { describe, it, expect } from 'vitest';
import {
  generateQRCode,
  parseQRCode,
  validateChecksum,
  validateAndParseQRCode,
  generateChecksum,
} from '../qr';

describe('QR Code Utilities', () => {
  const mockSchoolId = 'school-abc123';
  const mockStudentId = 'student-def456';

  describe('generateChecksum', () => {
    it('should generate 8-character hex checksum', async () => {
      const checksum = await generateChecksum(mockSchoolId, mockStudentId);

      expect(checksum).toBeDefined();
      expect(checksum).toHaveLength(8);
      expect(checksum).toMatch(/^[a-f0-9]{8}$/);
    });

    it('should generate consistent checksum for same inputs', async () => {
      const checksum1 = await generateChecksum(mockSchoolId, mockStudentId);
      const checksum2 = await generateChecksum(mockSchoolId, mockStudentId);

      expect(checksum1).toBe(checksum2);
    });

    it('should generate different checksums for different inputs', async () => {
      const checksum1 = await generateChecksum(mockSchoolId, mockStudentId);
      const checksum2 = await generateChecksum('different-school', mockStudentId);
      const checksum3 = await generateChecksum(mockSchoolId, 'different-student');

      expect(checksum1).not.toBe(checksum2);
      expect(checksum1).not.toBe(checksum3);
      expect(checksum2).not.toBe(checksum3);
    });

    it('should handle empty strings', async () => {
      const checksum = await generateChecksum('', '');

      expect(checksum).toBeDefined();
      expect(checksum).toHaveLength(8);
      expect(checksum).toMatch(/^[a-f0-9]{8}$/);
    });
  });

  describe('generateQRCode', () => {
    it('should generate QR code with correct format', async () => {
      const qrCode = await generateQRCode(mockSchoolId, mockStudentId);

      expect(qrCode).toBeDefined();
      expect(qrCode).toMatch(/^ABSQR:[^:]+:[^:]+:[a-f0-9]{8}$/);
      expect(qrCode.startsWith('ABSQR:')).toBe(true);
    });

    it('should include school and student IDs', async () => {
      const qrCode = await generateQRCode(mockSchoolId, mockStudentId);

      expect(qrCode).toContain(mockSchoolId);
      expect(qrCode).toContain(mockStudentId);
    });

    it('should generate valid checksum', async () => {
      const qrCode = await generateQRCode(mockSchoolId, mockStudentId);
      const isValid = await validateChecksum(qrCode);

      expect(isValid).toBe(true);
    });

    it('should generate different QR codes for different students', async () => {
      const qr1 = await generateQRCode(mockSchoolId, 'student-1');
      const qr2 = await generateQRCode(mockSchoolId, 'student-2');

      expect(qr1).not.toBe(qr2);
    });

    it('should generate different QR codes for different schools', async () => {
      const qr1 = await generateQRCode('school-1', mockStudentId);
      const qr2 = await generateQRCode('school-2', mockStudentId);

      expect(qr1).not.toBe(qr2);
    });
  });

  describe('parseQRCode', () => {
    it('should parse valid QR code', async () => {
      const qrCode = await generateQRCode(mockSchoolId, mockStudentId);
      const parsed = parseQRCode(qrCode);

      expect(parsed.valid).toBe(true);
      expect(parsed.schoolId).toBe(mockSchoolId);
      expect(parsed.studentId).toBe(mockStudentId);
      expect(parsed.checksum).toHaveLength(8);
      expect(parsed.error).toBeUndefined();
    });

    it('should reject QR code without ABSQR prefix', () => {
      const parsed = parseQRCode('INVALID:school:student:12345678');

      expect(parsed.valid).toBe(false);
      expect(parsed.error).toContain('missing ABSQR prefix');
    });

    it('should reject QR code with wrong number of parts', () => {
      const parsed = parseQRCode('ABSQR:school:student');

      expect(parsed.valid).toBe(false);
      expect(parsed.error).toContain('expected 4 parts');
    });

    it('should reject QR code with empty fields', () => {
      const parsed1 = parseQRCode('ABSQR::student:12345678');
      expect(parsed1.valid).toBe(false);
      expect(parsed1.error).toContain('empty field');

      const parsed2 = parseQRCode('ABSQR:school::12345678');
      expect(parsed2.valid).toBe(false);
      expect(parsed2.error).toContain('empty field');

      const parsed3 = parseQRCode('ABSQR:school:student:');
      expect(parsed3.valid).toBe(false);
      expect(parsed3.error).toContain('empty field');
    });

    it('should reject QR code with invalid checksum format', () => {
      const parsed1 = parseQRCode('ABSQR:school:student:123');
      expect(parsed1.valid).toBe(false);
      expect(parsed1.error).toContain('Invalid checksum format');

      const parsed2 = parseQRCode('ABSQR:school:student:GGGGGGGG');
      expect(parsed2.valid).toBe(false);
      expect(parsed2.error).toContain('Invalid checksum format');

      const parsed3 = parseQRCode('ABSQR:school:student:123456789');
      expect(parsed3.valid).toBe(false);
      expect(parsed3.error).toContain('Invalid checksum format');
    });

    it('should handle empty string', () => {
      const parsed = parseQRCode('');

      expect(parsed.valid).toBe(false);
      expect(parsed.error).toContain('required');
    });

    it('should handle non-string input', () => {
      const parsed = parseQRCode(null as any);

      expect(parsed.valid).toBe(false);
      expect(parsed.error).toContain('required');
    });

    it('should be case-insensitive for checksum validation', async () => {
      const qrCode = await generateQRCode(mockSchoolId, mockStudentId);
      const uppercaseQR = qrCode.toUpperCase();
      const parsed = parseQRCode(uppercaseQR);

      expect(parsed.valid).toBe(true);
      expect(parsed.checksum).toMatch(/^[A-F0-9]{8}$/);
    });
  });

  describe('validateChecksum', () => {
    it('should validate correct checksum', async () => {
      const qrCode = await generateQRCode(mockSchoolId, mockStudentId);
      const isValid = await validateChecksum(qrCode);

      expect(isValid).toBe(true);
    });

    it('should reject tampered checksum', async () => {
      const qrCode = await generateQRCode(mockSchoolId, mockStudentId);
      const tamperedQR = qrCode.slice(0, -8) + 'ffffffff';
      const isValid = await validateChecksum(tamperedQR);

      expect(isValid).toBe(false);
    });

    it('should reject invalid QR format', async () => {
      const isValid = await validateChecksum('INVALID-QR-CODE');

      expect(isValid).toBe(false);
    });

    it('should reject QR with wrong school ID', async () => {
      const qrCode = await generateQRCode(mockSchoolId, mockStudentId);
      const checksum = qrCode.split(':')[3];
      const tamperedQR = `ABSQR:wrong-school:${mockStudentId}:${checksum}`;
      const isValid = await validateChecksum(tamperedQR);

      expect(isValid).toBe(false);
    });

    it('should reject QR with wrong student ID', async () => {
      const qrCode = await generateQRCode(mockSchoolId, mockStudentId);
      const checksum = qrCode.split(':')[3];
      const tamperedQR = `ABSQR:${mockSchoolId}:wrong-student:${checksum}`;
      const isValid = await validateChecksum(tamperedQR);

      expect(isValid).toBe(false);
    });

    it('should be case-insensitive for checksum comparison', async () => {
      const qrCode = await generateQRCode(mockSchoolId, mockStudentId);
      
      // Extract parts and change only checksum case
      const parts = qrCode.split(':');
      const uppercaseChecksumQR = `${parts[0]}:${parts[1]}:${parts[2]}:${parts[3]!.toUpperCase()}`;
      const lowercaseChecksumQR = `${parts[0]}:${parts[1]}:${parts[2]}:${parts[3]!.toLowerCase()}`;

      const valid1 = await validateChecksum(uppercaseChecksumQR);
      const valid2 = await validateChecksum(lowercaseChecksumQR);

      expect(valid1).toBe(true);
      expect(valid2).toBe(true);
    });
  });

  describe('validateAndParseQRCode', () => {
    it('should validate and parse correct QR code', async () => {
      const qrCode = await generateQRCode(mockSchoolId, mockStudentId);
      const result = await validateAndParseQRCode(qrCode);

      expect(result.valid).toBe(true);
      expect(result.schoolId).toBe(mockSchoolId);
      expect(result.studentId).toBe(mockStudentId);
      expect(result.error).toBeUndefined();
    });

    it('should reject QR code with invalid format', async () => {
      const result = await validateAndParseQRCode('INVALID:format');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject QR code with invalid checksum', async () => {
      const qrCode = await generateQRCode(mockSchoolId, mockStudentId);
      const tamperedQR = qrCode.slice(0, -8) + 'aaaaaaaa';
      const result = await validateAndParseQRCode(tamperedQR);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('checksum');
    });

    it('should return early on parsing errors', async () => {
      const result = await validateAndParseQRCode('');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle complete validation flow', async () => {
      // Generate valid QR
      const validQR = await generateQRCode('school-123', 'student-456');
      const validResult = await validateAndParseQRCode(validQR);
      expect(validResult.valid).toBe(true);

      // Test invalid format
      const invalidFormat = await validateAndParseQRCode('NOT-A-QR');
      expect(invalidFormat.valid).toBe(false);

      // Test tampered checksum
      const tamperedQR = validQR.slice(0, -1) + 'x';
      const tamperedResult = await validateAndParseQRCode(tamperedQR);
      expect(tamperedResult.valid).toBe(false);
    });
  });

  describe('QR Code Security', () => {
    it('should prevent QR code forgery', async () => {
      // Attacker tries to create QR without knowing checksum algorithm
      const fakeQR = 'ABSQR:attacker-school:fake-student:12345678';
      const result = await validateAndParseQRCode(fakeQR);

      expect(result.valid).toBe(false);
    });

    it('should detect ID substitution attacks', async () => {
      const legitimateQR = await generateQRCode(mockSchoolId, mockStudentId);
      const checksum = legitimateQR.split(':')[3];

      // Attacker tries to substitute IDs while keeping checksum
      const attackQR = `ABSQR:attacker-school:attacker-student:${checksum}`;
      const result = await validateAndParseQRCode(attackQR);

      expect(result.valid).toBe(false);
    });

    it('should maintain integrity across different platforms', async () => {
      const qrCode = await generateQRCode(mockSchoolId, mockStudentId);

      // Test various string manipulations that shouldn't affect validation
      const result1 = await validateAndParseQRCode(qrCode);
      const result2 = await validateAndParseQRCode(qrCode.trim());

      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(true);
    });
  });
});
