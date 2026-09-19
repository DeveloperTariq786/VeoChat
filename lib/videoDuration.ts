/**
 * Video duration utilities for filtering and parsing YouTube video lengths.
 * Enforces an internal maximum duration limit of 20 minutes (1200 seconds).
 */

export const MAX_VIDEO_DURATION_SECONDS = 20 * 60; // 20 minutes = 1200 seconds

/**
 * Parses duration strings or numbers into total seconds.
 * Supports:
 * - "MM:SS" (e.g. "14:22", "3:33")
 * - "HH:MM:SS" (e.g. "1:04:20")
 * - ISO 8601 strings (e.g. "PT14M22S", "PT1H4M20S")
 * - Raw numbers (in seconds)
 * - "Live" (treated as Infinity)
 * - Natural language like "18 mins 30 secs"
 */
export function parseDurationToSeconds(duration: unknown): number | null {
  if (typeof duration === 'number') {
    return isNaN(duration) ? null : duration;
  }
  if (!duration || typeof duration !== 'string') {
    return null;
  }

  const str = duration.trim();
  if (!str) return null;

  if (str.toLowerCase() === 'live') {
    return Infinity;
  }

  // ISO 8601: PT#H#M#S
  if (/^pt/i.test(str)) {
    const hoursMatch = str.match(/(\d+)\s*H/i);
    const minsMatch = str.match(/(\d+)\s*M/i);
    const secsMatch = str.match(/(\d+)\s*S/i);
    const h = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
    const m = minsMatch ? parseInt(minsMatch[1], 10) : 0;
    const s = secsMatch ? parseInt(secsMatch[1], 10) : 0;
    return h * 3600 + m * 60 + s;
  }

  // Format "HH:MM:SS" or "MM:SS"
  const colons = str.split(':');
  if (colons.length === 2 || colons.length === 3) {
    const parsed = colons.map((c) => parseInt(c.trim(), 10));
    if (parsed.every((n) => !isNaN(n))) {
      if (colons.length === 3) {
        return parsed[0] * 3600 + parsed[1] * 60 + parsed[2];
      }
      return parsed[0] * 60 + parsed[1];
    }
  }

  // Text with hours/mins/secs (e.g., "18 mins 30 secs", "1 hour 15 mins")
  const hrMatch = str.match(/(\d+)\s*(?:hours?|hrs?|h)\b/i);
  const minMatch = str.match(/(\d+)\s*(?:minutes?|mins?|m)\b/i);
  const secMatch = str.match(/(\d+)\s*(?:seconds?|secs?|s)\b/i);
  if (hrMatch || minMatch || secMatch) {
    const h = hrMatch ? parseInt(hrMatch[1], 10) : 0;
    const m = minMatch ? parseInt(minMatch[1], 10) : 0;
    const s = secMatch ? parseInt(secMatch[1], 10) : 0;
    return h * 3600 + m * 60 + s;
  }

  return null;
}

/**
 * Checks if a video's duration is within the allowed ceiling (<= 20 minutes / 1200 seconds).
 */
export function isWithinAllowedDuration(
  duration: unknown,
  maxSeconds: number = MAX_VIDEO_DURATION_SECONDS
): boolean {
  if (duration === undefined || duration === null) {
    return true;
  }
  const seconds = parseDurationToSeconds(duration);
  if (seconds !== null) {
    return seconds <= maxSeconds;
  }

  // Heuristics for unparsed text strings
  if (typeof duration === 'string') {
    const lower = duration.toLowerCase();
    if (lower.includes('live') || lower.includes('hour') || lower.includes('hr')) {
      return false;
    }
    if ((lower.match(/:/g) || []).length >= 2) {
      return false;
    }
  }

  return true;
}
