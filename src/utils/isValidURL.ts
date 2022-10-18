const isValidURL = (url: string): Boolean => {
  try {
    new URL(url);
  } catch (error) {
    return false;
  }
  return true;
};

export default isValidURL;
