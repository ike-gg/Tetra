import A, { Downloader } from "@tobyg74/tiktok-api-dl";

export const getTikTokVideo = async (link: string) => {
  try {
    const data = await Downloader(link, { version: "v1" });

    if (data.status === "error") throw new Error(data.message);

    return data;
  } catch (error) {
    console.log(error);
    throw new Error("Downloading tiktok failed");
  }
};

// export default async (link: string) => {
//   const host = "https://ttsave.app/download?mode=video";
//   const body = { id: link };
//   const headers = { "User-Agent": "PostmanRuntime/7.31.1" };
//   const res = await needle("post", host, body, { headers, json: true });
//   try {
//     const $ = load(res.body);
//     return {
//       success: true,
//       author: {
//         name: $("div div h2").text(),
//         profile: $("div a").attr("href"),
//         username: $("div a.font-extrabold.text-blue-400.text-xl.mb-2").text(),
//       },
//       slides: {
//         images: $("div#button-download-ready")
//           .find("img")
//           .toArray()
//           .map((e) => $(e).attr("src")?.toString())
//           .filter((e) => e) as string[],
//       },
//       video: {
//         thumbnail: $("div.hidden.flex-col.text-center a:nth-child(5)").attr(
//           "href"
//         ),
//         views: $(
//           "div.flex.flex-row.items-center.justify-center.gap-2.mt-2 div:nth-child(1) span"
//         ).text(),
//         loves: $(
//           "div.flex.flex-row.items-center.justify-center.gap-2.mt-2 div:nth-child(2) span"
//         ).text(),
//         comments: $(
//           "div.flex.flex-row.items-center.justify-center.gap-2.mt-2 div:nth-child(3) span"
//         ).text(),
//         shares: $(
//           "div.flex.flex-row.items-center.justify-center.gap-2.mt-2 div:nth-child(4) span"
//         ).text(),
//         url: {
//           no_wm: $("a:contains('DOWNLOAD (WITHOUT WATERMARK)')").attr("href"),
//           wm: $("a:contains('DOWNLOAD (WITH WATERMARK)')").attr("href"),
//         },
//       },
//       backsound: {
//         name: $(
//           "div.flex.flex-row.items-center.justify-center.gap-1.mt-5 span"
//         ).text(),
//         url: $("a:contains('DOWNLOAD AUDIO (MP3)')").attr("href"),
//       },
//     };
//   } catch (error) {
//     console.error(error);
//     throw new Error("Something went wrong");
//   }
// };
