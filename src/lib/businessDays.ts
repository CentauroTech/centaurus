/**
 * Add business days to a date (skips weekends)
 */
export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let addedDays = 0;
  
  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      addedDays++;
    }
  }
  
  return result;
}

/**
 * Calculate business days between two dates
 */
export function getBusinessDaysBetween(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  
  while (current < end) {
    current.setDate(current.getDate() + 1);
    if (current.getDay() !== 0 && current.getDay() !== 6) {
      count++;
    }
  }
  
  return count;
}

/**
 * Format duration in a human-readable format
 */
export function formatDuration(startDate: Date | string, endDate?: Date | string | null): string {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = endDate 
    ? (typeof endDate === 'string' ? new Date(endDate) : endDate) 
    : new Date();
  
  const diffMs = end.getTime() - start.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  const remainingHours = diffHours % 24;
  
  if (diffDays > 0) {
    return `${diffDays}d ${remainingHours}h`;
  } else if (diffHours > 0) {
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}h ${diffMinutes}m`;
  } else {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes}m`;
  }
}
