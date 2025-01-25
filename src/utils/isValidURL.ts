const isValidURL = (url: string): Boolean => {
  try {
    new URL(url);
    // check if url has a http or https protocol
    if (!url.includes("http://") && !url.includes("https://")) {
      return false;
    }
  } catch (error) {
    return false;
  }
  return true;
};

export default isValidURL;
