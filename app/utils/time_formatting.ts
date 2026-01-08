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

export const getMinutesUntilArrival = (eta: string): number | null => {
  if (!eta) return null;
  const etaDate = new Date(eta);
  if (isNaN(etaDate.getTime())) return null;
  const now = new Date();
  const diffMs = etaDate.getTime() - now.getTime();
  return Math.max(0, Math.round(diffMs / 60000));
};
