export const removeQueryFromUrl = (plainurl: string): string => {
  const url = new URL(plainurl);
  const params = new URLSearchParams(url.search);
  const cleanUrl = url.href.replace(params.toString(), "");
  return cleanUrl;
};
