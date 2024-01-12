const isValidURL = (url: string): Boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export default isValidURL;
