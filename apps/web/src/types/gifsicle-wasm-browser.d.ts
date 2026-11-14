// Only the part we use: the worker that runs gifsicle (see src/lib/gif/gifsicle.ts)
declare module "gifsicle-wasm-browser" {
  const gifsicle: {
    tool: { worker: () => string };
  };
  export default gifsicle;
}
