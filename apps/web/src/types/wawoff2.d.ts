// Only the part we use: woff2 → ttf for satori in scripts/build-seo.tsx
declare module "wawoff2" {
  export function decompress(woff2: Uint8Array): Promise<Uint8Array>;
}
