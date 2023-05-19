export default (sourceUrl: string, animated: boolean) => {
  const sizes = ["1x", "2x", "3x", "4x"];
  const fullUrl = sourceUrl.replace("//", "https://");
  const urls = sizes.map((size) => {
    const url = `${fullUrl}/${size}.`;
    return animated ? `${url}gif` : `${url}webp`;
  });
  return {
    "1x": urls[0],
    "2x": urls[1],
    "3x": urls[2],
    "4x": urls[3],
  };
};
