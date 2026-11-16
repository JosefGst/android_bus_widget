// Utility functions for ETA formatting and calculation
import type { Language } from './language';

export const formatEtaToHKTime = (eta: string): string => {
  if (!eta) return 'N/A';
  const date = new Date(eta);
  if (isNaN(date.getTime())) return eta;
  return date.toLocaleTimeString('en-HK', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Hong_Kong',
  });
};

// Optionally pass a referenceTime (ISO string) to use as the 'current' time (e.g., from latest ETA data_timestamp)
export const getMinutesUntilArrival = (eta: string, referenceTime?: string): number | null => {
  if (!eta) return null;
  const etaDate = new Date(eta);
  if (isNaN(etaDate.getTime())) return null;
  let now: Date;
  if (referenceTime) {
    now = new Date(referenceTime);
    if (isNaN(now.getTime())) now = new Date();
  } else {
    now = new Date();
  }
  const diffMs = etaDate.getTime() - now.getTime();
  return Math.max(0, Math.round(diffMs / 60000));
};

/** "2:41 pm" / "下午2:41" in Hong Kong time, for "Updated …" labels. Empty when there is no valid time. */
export function formatClockTime(iso: string, language: Language): string {
  const date = new Date(iso)
  if (!iso || isNaN(date.getTime())) return ''
  // Only the 24-hour HK hour and minute come from Intl: Hermes on Android has no Chinese
  // locale data, so "上午/下午" (and "am/pm") are written here.
  const [hour, minute] = date
    .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Hong_Kong' })
    .split(':')
    .map(Number)
  const h12 = hour % 12 || 12
  const mm = String(minute).padStart(2, '0')
  if (language === 'en') return `${h12}:${mm} ${hour < 12 ? 'am' : 'pm'}`
  return `${hour < 12 ? '上午' : '下午'}${h12}:${mm}`
}
