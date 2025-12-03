/**
 * QR Code Utilities
 * Generate and validate QR codes for student attendance tracking
 * 
 * QR Code Format: ABSQR:{school_id}:{student_id}:{checksum}
 * Example: ABSQR:abc123:def456:a1b2c3d4
 */

/**
 * QR code parsing result
 */
export interface ParsedQRCode {
  schoolId: string;
  studentId: string;
  checksum: string;
  valid: boolean;
  error?: string;
}

/**
 * Generate a SHA-256 checksum (first 8 characters) for QR code validation
 * 
 * @param schoolId - School UUID
 * @param studentId - Student UUID
 * @returns First 8 characters of SHA-256 hash
 */
export async function generateChecksum(
  schoolId: string,
  studentId: string
): Promise<string> {
  const data = `${schoolId}:${studentId}`;
  
  // Encode the string to Uint8Array
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  
  // Generate SHA-256 hash
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  
  // Convert ArrayBuffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  
  // Return first 8 characters
  return hashHex.substring(0, 8);
}

/**
 * Generate a QR code string for a student
 * Format: ABSQR:{school_id}:{student_id}:{checksum}
 * 
 * @param schoolId - School UUID
 * @param studentId - Student UUID
 * @returns QR code string
 * 
 * @example
 * const qrCode = await generateQRCode('abc123', 'def456');
 * // Returns: "ABSQR:abc123:def456:a1b2c3d4"
 */
export async function generateQRCode(
  schoolId: string,
  studentId: string
): Promise<string> {
  const checksum = await generateChecksum(schoolId, studentId);
  return `ABSQR:${schoolId}:${studentId}:${checksum}`;
}

/**
 * Parse a QR code string and extract components
 * 
 * @param qrString - QR code string to parse
 * @returns Parsed QR code data with validation status
 * 
 * @example
 * const parsed = parseQRCode('ABSQR:abc123:def456:a1b2c3d4');
 * // Returns: { schoolId: 'abc123', studentId: 'def456', checksum: 'a1b2c3d4', valid: true }
 */
export function parseQRCode(qrString: string): ParsedQRCode {
  // Validate format
  if (!qrString || typeof qrString !== 'string') {
    return {
      schoolId: '',
      studentId: '',
      checksum: '',
      valid: false,
      error: 'QR code string is required',
    };
  }
  
  // Check prefix
  if (!qrString.startsWith('ABSQR:')) {
    return {
      schoolId: '',
      studentId: '',
      checksum: '',
      valid: false,
      error: 'Invalid QR code format: missing ABSQR prefix',
    };
  }
  
  // Split into parts
  const parts = qrString.split(':');
  
  // Validate parts count (ABSQR, schoolId, studentId, checksum)
  if (parts.length !== 4) {
    return {
      schoolId: '',
      studentId: '',
      checksum: '',
      valid: false,
      error: `Invalid QR code format: expected 4 parts, got ${parts.length}`,
    };
  }
  
  const [, schoolId, studentId, checksum] = parts;
  
  // Validate each part is not empty
  if (!schoolId || !studentId || !checksum) {
    return {
      schoolId: schoolId || '',
      studentId: studentId || '',
      checksum: checksum || '',
      valid: false,
      error: 'Invalid QR code format: empty field(s) detected',
    };
  }
  
  // Validate checksum format (should be 8 hex characters)
  if (!/^[a-f0-9]{8}$/i.test(checksum)) {
    return {
      schoolId,
      studentId,
      checksum,
      valid: false,
      error: 'Invalid checksum format: expected 8 hexadecimal characters',
    };
  }
  
  return {
    schoolId,
    studentId,
    checksum,
    valid: true,
  };
}

/**
 * Validate QR code checksum
 * Verifies that the checksum matches the expected value for the given school and student IDs
 * 
 * @param qrString - QR code string to validate
 * @returns True if checksum is valid, false otherwise
 * 
 * @example
 * const isValid = await validateChecksum('ABSQR:abc123:def456:a1b2c3d4');
 * // Returns: true if checksum matches
 */
export async function validateChecksum(qrString: string): Promise<boolean> {
  // Parse QR code
  const parsed = parseQRCode(qrString);
  
  // If parsing failed, checksum is invalid
  if (!parsed.valid) {
    return false;
  }
  
  // Generate expected checksum
  const expectedChecksum = await generateChecksum(
    parsed.schoolId,
    parsed.studentId
  );
  
  // Compare checksums (case-insensitive)
  return parsed.checksum.toLowerCase() === expectedChecksum.toLowerCase();
}

/**
 * Validate and parse QR code in one step
 * Convenience function that combines parsing and checksum validation
 * 
 * @param qrString - QR code string to validate and parse
 * @returns Parsed QR code data with full validation
 * 
 * @example
 * const result = await validateAndParseQRCode('ABSQR:abc123:def456:a1b2c3d4');
 * if (result.valid) {
 *   console.log('Valid QR code:', result.schoolId, result.studentId);
 * }
 */
export async function validateAndParseQRCode(
  qrString: string
): Promise<ParsedQRCode> {
  // First parse the QR code
  const parsed = parseQRCode(qrString);
  
  // If basic parsing failed, return early
  if (!parsed.valid) {
    return parsed;
  }
  
  // Validate checksum
  const checksumValid = await validateChecksum(qrString);
  
  if (!checksumValid) {
    return {
      ...parsed,
      valid: false,
      error: 'Invalid checksum: QR code integrity check failed',
    };
  }
  
  return parsed;
}
