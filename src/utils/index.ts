import { safeFetch } from "@/lib/network/url-guard";

export const getRemoteResourceDetails = async (url: string) => {
  try {
    const response = await safeFetch(url, {
      method: "HEAD",
    });

    if (!response.ok) return null;

    const size = Number(response.headers.get("content-length"));
    const mimeType = response.headers.get("content-type");

    return {
      size,
      mimeType,
    };
  } catch {
    return null;
  }
};
