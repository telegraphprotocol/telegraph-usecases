import { z } from "zod";

const X_POST_URL_PATTERN = /^https?:\/\/(www\.)?(x|twitter)\.com\/[^/]+\/status\/(\d+)/;

export const xPostUrlSchema = z
  .url()
  .refine((value) => X_POST_URL_PATTERN.test(value), {
    message: "URL must be an X/Twitter post URL"
  });

export const xPostUrlRequestSchema = z.object({
  url: xPostUrlSchema
});

export function extractTweetId(url: string): string | null {
  const match = url.match(X_POST_URL_PATTERN);
  return match?.[3] ?? null;
}

export function extractAuthorHandleFromUrl(url: string): string | undefined {
  const match = url.match(/(?:x\.com|twitter\.com)\/([^/]+)\/status\/\d+/);
  return match?.[1];
}
