import { clsx, type ClassValue } from 'clsx';
import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  parseISO,
} from 'date-fns';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a timestamp for display in chat messages
 * - "Just now" for messages less than 1 minute ago
 * - "X minutes ago" for messages less than 1 hour ago
 * - "HH:MM" for messages today
 * - "Yesterday HH:MM" for messages yesterday
 * - "MMM DD HH:MM" for messages this year
 * - "MMM DD, YYYY HH:MM" for older messages
 */
export function formatMessageTime(timestamp: string | null): string {
  if (!timestamp) return '';

  try {
    const date = parseISO(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    // Just now (less than 1 minute)
    if (diffInMinutes < 1) {
      return 'Just now';
    }

    // X minutes ago (less than 1 hour)
    if (diffInMinutes < 60) {
      return formatDistanceToNow(date, { addSuffix: true });
    }

    // Today - show time only
    if (isToday(date)) {
      return format(date, 'HH:mm');
    }

    // Yesterday
    if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    }

    // This year - show month, day, time
    if (date.getFullYear() === now.getFullYear()) {
      return format(date, 'MMM dd HH:mm');
    }

    // Older - show full date
    return format(date, 'MMM dd, yyyy HH:mm');
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return timestamp;
  }
}
