import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  const formatted = exponent === 0 ? value.toFixed(0) : value.toFixed(decimals);
  return `${formatted} ${UNITS[exponent]}`;
}

export function formatDate(epochMillis: number): string {
  return dayjs(epochMillis).format('MMM D, YYYY h:mm A');
}

export function formatDateShort(epochMillis: number): string {
  const now = dayjs();
  const date = dayjs(epochMillis);
  if (date.isSame(now, 'day')) return date.format('h:mm A');
  if (date.isSame(now, 'year')) return date.format('MMM D');
  return date.format('MMM D, YYYY');
}

export function formatRelativeTime(epochMillis: number): string {
  return dayjs(epochMillis).fromNow();
}

export function formatDaysRemaining(deletedAt: number, retentionDays: number): number {
  const expiresAt = deletedAt + retentionDays * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000)));
}
