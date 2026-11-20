/** "168" → "every 7 days", "12" → "every 12 hours". */
export const intervalLabel = (hours: number) => {
  if (hours <= 0) return 'Automatic sync is off';
  if (hours % 24 === 0) return hours === 24 ? 'every day' : `every ${hours / 24} days`;
  return hours === 1 ? 'every hour' : `every ${hours} hours`;
};
