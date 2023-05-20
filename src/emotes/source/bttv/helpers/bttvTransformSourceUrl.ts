import { bttvCdn } from "./constants";

export default (emoteId: string, animated: boolean) => {
  const sizes = ["1x", "2x", "3x"];
  const baseUrl = `${bttvCdn}/${emoteId}`;

  const sizesUrl = sizes.map((size) => {
    const extension = animated ? "gif" : "png";
    return `${baseUrl}/${size}.${extension}`;
  });

  return {
    "1x": sizesUrl[0],
    "2x": sizesUrl[1],
    "3x": sizesUrl[2],
  };
};
