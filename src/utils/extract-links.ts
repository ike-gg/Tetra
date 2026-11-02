const extractLinks = (message: string): string[] => {
  const linkRegex =
    /(?:^|\s)(https?:\/\/[\w-]+(?:\.[\w-]+)+(?:[\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?)/gi;

  const links = message.match(linkRegex)?.map((link) => link.trim());
  return links ? links : [];
};

export default extractLinks;
