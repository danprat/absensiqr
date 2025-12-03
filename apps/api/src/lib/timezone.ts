/**
 * Timezone Utilities
 * Handles Indonesian timezone operations (WIB, WITA, WIT)
 */

/**
 * Indonesian timezone definitions
 */
export const TIMEZONES = {
  WIB: 'Asia/Jakarta',   // UTC+7 (Western Indonesian Time)
  WITA: 'Asia/Makassar', // UTC+8 (Central Indonesian Time)
  WIT: 'Asia/Jayapura',  // UTC+9 (Eastern Indonesian Time)
} as const;

export type TimezoneType = keyof typeof TIMEZONES;

/**
 * School hours configuration
 */
export interface DaySchedule {
  start: string; // HH:mm format, e.g., "07:00"
  end: string;   // HH:mm format, e.g., "15:00"
}

export interface SchoolHours {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
}

/**
 * Get the IANA timezone identifier for a given Indonesian timezone
 * 
 * @param timezone - Indonesian timezone code (WIB, WITA, WIT)
 * @returns IANA timezone identifier
 * 
 * @example
 * getTimezoneIdentifier('WIB') // returns 'Asia/Jakarta'
 */
export function getTimezoneIdentifier(timezone: TimezoneType): string {
  return TIMEZONES[timezone];
}

/**
 * Get current time in school's timezone
 * 
 * @param schoolTimezone - School's timezone (WIB, WITA, WIT)
 * @returns Date object representing current time in school's timezone
 * 
 * @example
 * const schoolTime = getSchoolLocalTime('WIB');
 */
export function getSchoolLocalTime(schoolTimezone: TimezoneType): Date {
  const timezoneId = getTimezoneIdentifier(schoolTimezone);
  
  // Get current UTC time
  const now = new Date();
  
  // Convert to school timezone using Intl API
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezoneId,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';
  
  const year = parseInt(getPart('year'), 10);
  const month = parseInt(getPart('month'), 10);
  const day = parseInt(getPart('day'), 10);
  const hours = parseInt(getPart('hour'), 10);
  const minutes = parseInt(getPart('minute'), 10);
  const seconds = parseInt(getPart('second'), 10);
  
  return new Date(year, month - 1, day, hours, minutes, seconds);
}

/**
 * Format a date in school's timezone
 * 
 * @param date - Date to format
 * @param schoolTimezone - School's timezone (WIB, WITA, WIT)
 * @param format - Output format ('date', 'time', 'datetime', 'iso')
 * @returns Formatted date string
 * 
 * @example
 * formatInSchoolTimezone(new Date(), 'WIB', 'datetime')
 * // returns "2024-12-03 14:30:00"
 */
export function formatInSchoolTimezone(
  date: Date,
  schoolTimezone: TimezoneType,
  format: 'date' | 'time' | 'datetime' | 'iso' = 'datetime'
): string {
  const timezoneId = getTimezoneIdentifier(schoolTimezone);
  
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezoneId,
    hour12: false,
  };
  
  switch (format) {
    case 'date':
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
      return new Intl.DateTimeFormat('id-ID', options)
        .format(date)
        .split('/')
        .reverse()
        .join('-');
      
    case 'time':
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.second = '2-digit';
      return new Intl.DateTimeFormat('en-US', options)
        .format(date)
        .replace(/,/g, '');
      
    case 'datetime':
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.second = '2-digit';
      {
        const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(date);
        const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';
        
        return `${getPart('year')}-${getPart('month')}-${getPart('day')} ${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;
      }
      
    case 'iso':
      return new Intl.DateTimeFormat('sv-SE', {
        ...options,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(date).replace(' ', 'T');
      
    default:
      return date.toISOString();
  }
}

/**
 * Parse time string (HH:mm) to minutes since midnight
 * 
 * @param timeStr - Time string in HH:mm format
 * @returns Minutes since midnight
 * 
 * @example
 * parseTimeToMinutes("07:30") // returns 450
 */
function parseTimeToMinutes(timeStr: string): number {
  const parts = timeStr.split(':');
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  
  if (isNaN(hours) || isNaN(minutes) || hours === undefined || minutes === undefined) {
    throw new Error(`Invalid time format: ${timeStr}. Expected HH:mm`);
  }
  
  return hours * 60 + minutes;
}

/**
 * Get day name from Date object
 * 
 * @param date - Date object
 * @returns Day name in lowercase (e.g., 'monday', 'tuesday')
 */
function getDayName(date: Date): keyof SchoolHours {
  const days: (keyof SchoolHours)[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  
  return days[date.getDay()]!;
}

/**
 * Check if current time is within school hours
 * 
 * @param schoolTimezone - School's timezone (WIB, WITA, WIT)
 * @param schoolHours - School hours configuration
 * @param currentTime - Current time (optional, defaults to now)
 * @returns Object with isWithinHours flag and details
 * 
 * @example
 * const result = isWithinSchoolHours('WIB', {
 *   monday: { start: "07:00", end: "15:00" }
 * });
 * // returns { isWithinHours: true, daySchedule: {...}, currentTime: "08:30" }
 */
export function isWithinSchoolHours(
  schoolTimezone: TimezoneType,
  schoolHours: SchoolHours,
  currentTime?: Date
): {
  isWithinHours: boolean;
  daySchedule: DaySchedule | null;
  currentTimeStr: string;
  dayName: string;
} {
  // Get current time in school timezone
  const time = currentTime || getSchoolLocalTime(schoolTimezone);
  const dayName = getDayName(time);
  const daySchedule = schoolHours[dayName] || null;
  
  // Format current time as HH:mm
  const currentHour = time.getHours().toString().padStart(2, '0');
  const currentMinute = time.getMinutes().toString().padStart(2, '0');
  const currentTimeStr = `${currentHour}:${currentMinute}`;
  
  // If no schedule for this day, not within hours
  if (!daySchedule) {
    return {
      isWithinHours: false,
      daySchedule: null,
      currentTimeStr,
      dayName,
    };
  }
  
  try {
    const currentMinutes = parseTimeToMinutes(currentTimeStr);
    const startMinutes = parseTimeToMinutes(daySchedule.start);
    const endMinutes = parseTimeToMinutes(daySchedule.end);
    
    const isWithinHours = currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    
    return {
      isWithinHours,
      daySchedule,
      currentTimeStr,
      dayName,
    };
  } catch (error) {
    console.error('Error checking school hours:', error);
    
    return {
      isWithinHours: false,
      daySchedule,
      currentTimeStr,
      dayName,
    };
  }
}

/**
 * Get timezone offset in hours for a given timezone
 * 
 * @param timezone - Indonesian timezone code (WIB, WITA, WIT)
 * @returns Offset in hours from UTC
 * 
 * @example
 * getTimezoneOffset('WIB') // returns 7
 */
export function getTimezoneOffset(timezone: TimezoneType): number {
  const offsets: Record<TimezoneType, number> = {
    WIB: 7,
    WITA: 8,
    WIT: 9,
  };
  
  return offsets[timezone];
}

/**
 * Validate school hours configuration
 * 
 * @param schoolHours - School hours object to validate
 * @returns Validation result with errors if any
 * 
 * @example
 * const validation = validateSchoolHours({
 *   monday: { start: "07:00", end: "15:00" }
 * });
 */
export function validateSchoolHours(schoolHours: SchoolHours): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  
  for (const [day, schedule] of Object.entries(schoolHours)) {
    if (!schedule) continue;
    
    // Validate time format
    if (!timeRegex.test(schedule.start)) {
      errors.push(`Invalid start time format for ${day}: ${schedule.start}`);
    }
    
    if (!timeRegex.test(schedule.end)) {
      errors.push(`Invalid end time format for ${day}: ${schedule.end}`);
    }
    
    // Validate start is before end
    try {
      const startMinutes = parseTimeToMinutes(schedule.start);
      const endMinutes = parseTimeToMinutes(schedule.end);
      
      if (startMinutes >= endMinutes) {
        errors.push(`Start time must be before end time for ${day}`);
      }
    } catch (error) {
      errors.push(`Invalid time values for ${day}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get current date in school timezone (YYYY-MM-DD format)
 * Useful for attendance date queries
 * 
 * @param schoolTimezone - School's timezone (WIB, WITA, WIT)
 * @returns Date string in YYYY-MM-DD format
 */
export function getSchoolDate(schoolTimezone: TimezoneType): string {
  return formatInSchoolTimezone(new Date(), schoolTimezone, 'date');
}
