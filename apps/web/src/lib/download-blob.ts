export const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  // The click starts the download synchronously; the URL is only needed until then
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
