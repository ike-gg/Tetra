import { MediaOutput, PlatformResult } from "../../commands/media";

import { FeedbackManager } from "../managers/FeedbackManager";
import fetch from "node-fetch";
import * as z from "zod";
import { JSDOM } from "jsdom";

export const handleRedditMedia = async (
  _url: string,
  feedback: FeedbackManager
): Promise<PlatformResult> => {
  const url = new URL(_url);
  url.host = url.host.replace("reddit", "rxddit");
  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": "Discordbot",
    },
  });

  if (response.status !== 200) throw new Error("Reddit API call failed.");

  const html = await response.text();
  const { document } = new JSDOM(html).window;

  let videoUrls: string[] = [];
  let imageUrls: string[] = [];
  const title =
    document
      .querySelector('meta[property="og:title"]')
      ?.getAttribute("content") ?? "Reddit Post";
  const plainDescription =
    document
      .querySelector('meta[property="og:description"]')
      ?.getAttribute("content") ?? "";

  // sometimes content can begin with the gallery and some words and two line breaks, delete it.

  const description = plainDescription.startsWith("🖼️ Gallery")
    ? plainDescription.split("\n").slice(2).join("\n")
    : plainDescription;

  document.querySelectorAll('meta[property="og:video"]').forEach((video) => {
    const urlVideo = video.getAttribute("content");
    if (urlVideo) videoUrls.push(urlVideo);
  });

  document.querySelectorAll('meta[property="og:image"]').forEach((image) => {
    const urlImage = image.getAttribute("content");
    if (urlImage) imageUrls.push(urlImage);
  });

  return {
    description: `**${title}**
    ${description}`,
    media: [
      ...videoUrls.map(
        (v): MediaOutput => ({
          type: "mp4",
          source: v,
        })
      ),
      ...imageUrls.map(
        (i): MediaOutput => ({
          source: i,
          type: "jpg",
        })
      ),
    ],
  };
};
