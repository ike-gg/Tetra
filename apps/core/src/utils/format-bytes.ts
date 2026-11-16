const KB = 1024;
const MB = 1024 * KB;

const trim = (value: number) => String(Math.round(value * 10) / 10);

/**
 * Sizes in user-facing texts (docs/voice.md: technical units). Binary units, like Discord's
 * limits: 262144 → `256 KB`, 10485760 → `10 MB`, 35826432 → `34 MB`, 8808038 → `8.4 MB`.
 */
export const formatBytes = (bytes: number) => {
  if (bytes < KB) return `${Math.round(bytes)} B`;
  // Rounding up to 1024 KB moves on to MB
  if (Math.round(bytes / KB) < 1024) return `${Math.round(bytes / KB)} KB`;
  const mb = bytes / MB;
  return `${mb < 10 ? trim(mb) : Math.round(mb)} MB`;
};
