import { formatFetchError, UpstreamError } from "../errors";
import { PostMedia, XPostDetails } from "../types";
import { extractAuthorHandleFromUrl, extractTweetId } from "../validation/xPostUrl";
import { XPostProvider } from "./xPostProvider";

interface VxMediaExtended {
  type?: string;
  url?: string;
  thumbnail_url?: string;
}

interface VxTweetResponse {
  text?: string;
  mediaURLs?: string[];
  media_extended?: VxMediaExtended[];
  user_name?: string;
  user_screen_name?: string;
}

export interface VxTwitterPostProviderOptions {
  apiBase?: string;
  fetchImpl?: typeof fetch;
}

export class VxTwitterPostProvider implements XPostProvider {
  private readonly apiBase: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: VxTwitterPostProviderOptions = {}) {
    this.apiBase = (opts.apiBase ?? "https://api.vxtwitter.com").replace(/\/$/, "");
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async fetchPostDetails(url: string): Promise<XPostDetails> {
    const tweetId = extractTweetId(url);
    if (!tweetId) {
      throw new UpstreamError("INVALID_URL", "Could not extract tweet id from URL", 400);
    }

    const apiUrl = this.toApiUrl(url);
    let response: Response;
    try {
      response = await this.fetchImpl(apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json"
        }
      });
    } catch (error) {
      throw new UpstreamError(
        "VX_API_NETWORK_ERROR",
        `Network error while calling vxTwitter API: ${formatFetchError(error)}`,
        502
      );
    }

    if (!response.ok) {
      const detail = await this.readFailureDetail(response);
      throw new UpstreamError(
        "VX_API_ERROR",
        `vxTwitter API returned HTTP ${response.status}: ${detail}`,
        502
      );
    }

    let body: VxTweetResponse;
    try {
      body = (await response.json()) as VxTweetResponse;
    } catch {
      throw new UpstreamError("VX_API_INVALID_JSON", "vxTwitter returned invalid JSON", 502);
    }

    const text = typeof body.text === "string" ? body.text : "";
    const media = this.mapMedia(body);

    return {
      id: tweetId,
      authorHandle: body.user_screen_name ?? extractAuthorHandleFromUrl(url),
      text,
      media,
      sourceUrl: url
    };
  }

  private toApiUrl(tweetUrl: string): string {
    return tweetUrl.replace(
      /^https?:\/\/(?:www\.)?(twitter\.com|x\.com)/,
      this.apiBase
    );
  }

  private mapMedia(body: VxTweetResponse): PostMedia[] {
    const mapped: PostMedia[] = [];

    if (Array.isArray(body.media_extended) && body.media_extended.length > 0) {
      for (const item of body.media_extended) {
        if (!item.url) continue;
        const lowered = (item.type ?? "").toLowerCase();
        const type: PostMedia["type"] =
          lowered.includes("gif")
            ? "gif"
            : lowered.includes("video")
              ? "video"
              : "image";
        mapped.push({
          type,
          url: item.url,
          previewUrl: item.thumbnail_url
        });
      }
      return mapped;
    }

    if (Array.isArray(body.mediaURLs)) {
      for (const url of body.mediaURLs) {
        mapped.push({ type: "image", url });
      }
    }
    return mapped;
  }

  private async readFailureDetail(response: Response): Promise<string> {
    const raw = await response.text();
    if (!raw.trim()) return response.statusText || `HTTP ${response.status}`;
    return raw.length > 400 ? `${raw.slice(0, 400)}...` : raw;
  }
}
