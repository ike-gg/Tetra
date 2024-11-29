import fetch from "node-fetch";
import sleep from "../../utils/sleep";

interface GetBufferOptions {
  maxRetries: number;
  msBetweenRetries: number;
}

type GetBufferOptionsArg = Partial<GetBufferOptions>;

const defaultOptions: GetBufferOptions = {
  maxRetries: 3,
  msBetweenRetries: 1000,
};

const getBufferFromUrl = async (url: string, options?: GetBufferOptionsArg) => {
  const { maxRetries, msBetweenRetries } = {
    ...defaultOptions,
    ...options,
  };
  let retries = 0;

  let data: Buffer | null = null;

  do {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url} - ${response.status}`);
      }
      const buffer = await response.buffer();
      data = buffer;
      break;
    } catch (error) {
      console.log(url);
      console.error(
        `(${retries + 1}/${maxRetries}) Failed to fetch ${url} - ${error},`,
        (error as Error).message
      );
    }

    retries++;
    if (retries < maxRetries) await sleep(msBetweenRetries);
  } while (retries < maxRetries);

  if (!data) throw new Error("Data download failed.");

  return data;
};

export default getBufferFromUrl;
