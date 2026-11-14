const KB = 1024;
const MB = KB * 1024;

// Binary units, matching how Discord states its limits (256 KB = 262 144 bytes)
export const formatBytes = (bytes: number) =>
  bytes >= MB ? `${(bytes / MB).toFixed(2)} MB` : `${Math.round(bytes / KB)} KB`;
