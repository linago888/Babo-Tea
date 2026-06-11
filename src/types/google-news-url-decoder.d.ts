/**
 * Ambient types for `google-news-url-decoder` (ships no .d.ts).
 * Mirrors the CommonJS `module.exports = { GoogleDecoder }` surface we use.
 */
declare module "google-news-url-decoder" {
  export type DecodeResult =
    | { status: true; decoded_url: string }
    | { status: false; message: string };

  export type DecodeBatchResult =
    | { status: true; source_url: string; decoded_url: string }
    | { status: false; source_url?: string; message: string };

  export class GoogleDecoder {
    constructor(proxy?: string | null);
    /** Full pipeline: extract base64 → fetch sg/ts → batchexecute → real URL. */
    decode(sourceUrl: string): Promise<DecodeResult>;
    decodeBatch(sourceUrls: string[]): Promise<DecodeBatchResult[]>;
  }
}
