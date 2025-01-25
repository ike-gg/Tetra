export const getRemoteResourceDetails = async (url: string) => {
  try {
    const response = await fetch(url, {
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
