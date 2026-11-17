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
