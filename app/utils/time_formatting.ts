// Utility functions for ETA formatting and calculation

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
