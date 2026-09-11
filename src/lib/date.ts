import {
  compareDesc,
  constructNow,
  differenceInMilliseconds,
  format,
  formatISO,
  getTime,
  isPast,
  isValid,
  parseISO,
  subHours,
} from "date-fns";

const DATE_TIME_DISPLAY_PATTERN = "yyyy/M/d HH:mm:ss";
const TIME_DISPLAY_PATTERN = "HH:mm";

export function parseDateTime(value: string): Date {
  return parseISO(value);
}

export function isValidDateTime(value: string): boolean {
  return isValid(parseDateTime(value));
}

export function formatIsoDateTime(value: string): string {
  return formatISO(parseDateTime(value));
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const date = parseDateTime(value);
  return isValid(date) ? format(date, DATE_TIME_DISPLAY_PATTERN) : value;
}

export function formatTime(value?: string | null): string {
  if (!value) return "-";
  const date = parseDateTime(value);
  return isValid(date) ? format(date, TIME_DISPLAY_PATTERN) : value;
}

export function compareDateTimesDescending(left: string, right: string): number {
  const leftDate = parseDateTime(left);
  const rightDate = parseDateTime(right);
  if (!isValid(leftDate) || !isValid(rightDate)) return 0;
  return compareDesc(leftDate, rightDate);
}

export function isDateTimeExpired(value?: string | null): boolean {
  if (!value) return false;
  const date = parseDateTime(value);
  return isValid(date) && isPast(date);
}

export function getCurrentTimestamp(): number {
  return getTime(constructNow(undefined));
}

export function hasElapsed(startedAt: number, durationMs: number): boolean {
  return differenceInMilliseconds(constructNow(undefined), startedAt) >= durationMs;
}

export function getPreviousHoursDateTimeRange(hours: number): { start: string; end: string } {
  const end = constructNow(undefined);
  return {
    start: formatISO(subHours(end, hours)),
    end: formatISO(end),
  };
}
