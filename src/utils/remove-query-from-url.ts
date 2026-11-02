export const removeQueryFromUrl = (plainurl: string): string => {
  const url = new URL(plainurl);
  url.search = "";
  return url.toString();
};
