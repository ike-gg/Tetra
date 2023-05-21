import { Emote } from "../../../types";

const getSourceFile = async (sourceUrl: string): Promise<Emote> => {
  try {
    const response = await fetch(sourceUrl);

    if (!response.ok)
      throw new Error("Request to source failed. (SOURCE_NOT_OK)");

    const contentType = response.headers.get("content-type");

    if (contentType && /^image\/(gif|jpe?g|png|webp)/.test(contentType)) {
      return {
        animated: contentType.includes("gif"),
        author: "-",
        file: {
          preview: sourceUrl,
          url: sourceUrl,
        },
        id: sourceUrl,
        name: "Emote name",
        origin: "source",
      };
    }

    throw new Error("Not supported file.");
  } catch (error) {
    throw new Error(String(error));
  }
};

export default getSourceFile;
