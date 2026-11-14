// Core's upload endpoints take these three only; emote mode never renders JPEG
const EMOTE_DATA_URL = /^data:image\/(gif|png|webp);base64,/;

/** An editor result as the data URL core's upload endpoints take. */
export const toEmoteDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      if (EMOTE_DATA_URL.test(url)) resolve(url);
      else reject(new Error("Only GIF, PNG and WebP can be added."));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
