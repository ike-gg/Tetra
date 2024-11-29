import { EmbeddedError, ErrorType } from "../../../constants/errors";
import { env } from "../../../env";

interface DefaultCobaltAPIResponse {
  status: "error" | "redirect" | "stream" | "success" | "rate-limit" | "picker";
  url?: string;
  pickerType?: "various" | "images";
  picker?: {
    type?: "photo" | "video";
    url: string;
  }[];
  audio?: string;
  text?: string;
}

interface CobaltAPIOptions {
  videoQuality?: "480" | "720" | "1080";
}

export const fetchCobaltAPI = async <T = DefaultCobaltAPIResponse>(
  url: string,
  options?: CobaltAPIOptions
): Promise<T> => {
  const response = await fetch(env.COBALT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Api-Key ${env.COBALT_API_KEY}`,
    },
    body: JSON.stringify({
      url,
      ...options,
    }),
  });

  if (response.status === 400) throw new EmbeddedError("Cobalt API Error (Response 400)");

  if (!response.ok) {
    try {
      const data = (await response.json()) as DefaultCobaltAPIResponse;

      if (data.status !== "error" || !data.text) {
        throw new EmbeddedError("Cobalt API Error", {
          type: ErrorType.ERROR,
          origin: data,
        });
      }

      throw new EmbeddedError(data.text, {
        type: ErrorType.ERROR,
      });
    } catch {
      throw new EmbeddedError("Cobalt API Error", {
        type: ErrorType.ERROR,
      });
    }
  }

  return (await response.json()) as T;
};
