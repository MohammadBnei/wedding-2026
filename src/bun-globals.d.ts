/**
 * Just enough of Bun's global to type-check the two APIs the wall uses.
 *
 * NOT `@types/bun`, deliberately — jsconfig.json already records why that
 * package cannot be installed here: it replaces the DOM's setTimeout with Bun's,
 * so every browser-side timer handle in src/lib/components stops being a number
 * and Door.svelte fails to compile. This file declares the two things we call
 * and nothing else, so the DOM lib is left alone.
 *
 * These are runtime-only and server-only: the container runs `bun ./build/index.js`
 * and package.json forces `bunx --bun vite dev`, because vite's shebang is
 * `#!/usr/bin/env node` and `bun run` honours it — without --bun, dev runs under
 * Node and `Bun` is undefined.
 */
/**
 * Bun provides Node's Buffer at runtime, but @types/node is only present here
 * transitively and svelte-check resolves it differently on the CI runner than
 * locally — so the base64 encode in moderate.js type-checked here and failed
 * there. Declared narrowly rather than depending on that resolution.
 */
declare const Buffer: {
  from(data: Uint8Array | ArrayBuffer | string, encoding?: string): {
    toString(encoding?: string): string;
  };
};

declare namespace Bun {
  /** The two file helpers the dev fallback uses when S3_ENDPOINT is unset. */
  function write(path: string, data: Uint8Array | string): Promise<number>;
  function file(path: string): {
    exists(): Promise<boolean>;
    bytes(): Promise<Uint8Array>;
  };

  type ImageOptions = { maxPixels?: number; autoOrient?: boolean };
  type ResizeOptions = { fit?: 'inside' | 'cover' | 'contain' | 'fill' };
  type EncodeOptions = { quality?: number };

  class Image {
    constructor(source: Uint8Array | ArrayBuffer | Buffer, options?: ImageOptions);
    resize(width: number, height?: number, options?: ResizeOptions): Image;
    jpeg(options?: EncodeOptions): Image;
    png(options?: EncodeOptions): Image;
    webp(options?: EncodeOptions): Image;
    bytes(): Promise<Uint8Array>;
    metadata(): Promise<{ width: number; height: number; format: string }>;
  }

  class S3Client {
    constructor(options: {
      accessKeyId?: string;
      secretAccessKey?: string;
      bucket?: string;
      endpoint?: string;
      region?: string;
    });
    write(key: string, data: Uint8Array, options?: { type?: string }): Promise<number>;
    file(key: string): { bytes(): Promise<Uint8Array> };
  }
}
