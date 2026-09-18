/**
 * Date and Time utility functions for KisanLink
 * Consistent local timezone formatting (e.g. "16 Sep 2026, 10:35 AM")
 */

export function formatDateTime(dateInput?: string | Date | number | null): string {
  if (!dateInput) return 'N/A';
  try {
    const d = parseDateInput(dateInput);
    if (!d || isNaN(d.getTime())) return String(dateInput);

    const day = d.getDate();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();

    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;

    return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
  } catch (e) {
    return String(dateInput);
  }
}

export function formatDateOnly(dateInput?: string | Date | number | null): string {
  if (!dateInput) return 'N/A';
  try {
    const d = parseDateInput(dateInput);
    if (!d || isNaN(d.getTime())) return String(dateInput);

    const day = d.getDate();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();

    return `${day} ${month} ${year}`;
  } catch (e) {
    return String(dateInput);
  }
}

export function formatTimeOnly(dateInput?: string | Date | number | null): string {
  if (!dateInput) return 'N/A';
  try {
    const d = parseDateInput(dateInput);
    if (!d || isNaN(d.getTime())) return String(dateInput);

    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;

    return `${hours}:${minutes} ${ampm}`;
  } catch (e) {
    return String(dateInput);
  }
}

export function isSlotExpired(slotDateStr?: string, timeWindowStr?: string): boolean {
  if (!slotDateStr) return false;
  try {
    const now = new Date();
    
    // Parse slot date (YYYY-MM-DD or DD Month YYYY)
    let slotDate = parseDateInput(slotDateStr);
    if (!slotDate || isNaN(slotDate.getTime())) return false;

    // Check if slot date is strictly in the past (before today 00:00:00)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const slotDayStart = new Date(slotDate.getFullYear(), slotDate.getMonth(), slotDate.getDate(), 0, 0, 0);

    if (slotDayStart.getTime() < todayStart.getTime()) {
      return true; // Date is strictly in the past
    }

    if (slotDayStart.getTime() > todayStart.getTime()) {
      return false; // Date is in the future
    }

    // If slot is today, check end of time window (e.g. "10:00 AM – 12:00 PM" -> 12:00 PM)
    if (timeWindowStr) {
      const windowParts = timeWindowStr.split(/[-–—]/);
      const endTimePart = windowParts.length > 1 ? windowParts[1].trim() : windowParts[0].trim();
      
      const parsedEndTime = parseTimeString(endTimePart);
      if (parsedEndTime) {
        const slotEndDateTime = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          parsedEndTime.hours,
          parsedEndTime.minutes,
          0
        );
        return now.getTime() > slotEndDateTime.getTime();
      }
    }

    return false;
  } catch (e) {
    return false;
  }
}

function parseDateInput(input: string | Date | number): Date | null {
  if (input instanceof Date) return input;
  if (typeof input === 'number') return new Date(input);
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // If string already includes ISO Z or T
    if (trimmed.includes('T') || trimmed.includes('Z')) {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) return d;
    }

    // Attempt direct parse
    const directDate = new Date(trimmed);
    if (!isNaN(directDate.getTime())) return directDate;
  }
  return null;
}

function parseTimeString(timeStr: string): { hours: number; minutes: number } | null {
  try {
    const match = timeStr.match(/(\d+):?(\d+)?\s*(AM|PM)?/i);
    if (!match) return null;

    let hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const ampm = match[3] ? match[3].toUpperCase() : null;

    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    return { hours, minutes };
  } catch (e) {
    return null;
  }
}
