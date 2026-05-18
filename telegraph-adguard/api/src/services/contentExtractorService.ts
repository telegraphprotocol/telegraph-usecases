import { UpstreamError } from "../errors";
import type { ExtractedContent } from "../types";

const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function toAbsoluteUrl(src: string, base: string): string | null {
  src = src.trim();
  if (!src || src.startsWith("data:")) return null;
  try {
    return new URL(src, base).href;
  } catch {
    return null;
  }
}

function extractImages(html: string, baseUrl: string, maxImages: number): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  const addUrl = (src: string) => {
    const abs = toAbsoluteUrl(src, baseUrl);
    if (!abs || seen.has(abs)) return;
    // Skip SVGs, scripts, stylesheets, and obviously non-image assets
    if (/\.(svg|js|css|html?|php|xml|pdf|woff2?|ttf|eot|ico)(\?.*)?$/i.test(abs)) return;
    // Skip tiny tracking pixels by path hint
    if (/\/(pixel|track|beacon|1x1|spacer)\./i.test(abs)) return;
    seen.add(abs);
    results.push(abs);
  };

  // og:image first (highest quality, most relevant)
  const ogMatches = html.matchAll(/<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/gi);
  for (const m of ogMatches) addUrl(m[1]);

  const ogMatches2 = html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image["']/gi);
  for (const m of ogMatches2) addUrl(m[1]);

  // <img src>
  const imgMatches = html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi);
  for (const m of imgMatches) {
    if (results.length >= maxImages) break;
    addUrl(m[1]);
  }

  return results.slice(0, maxImages);
}

function extractText(html: string): string {
  // Remove script, style, nav, header, footer blocks entirely
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ");

  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");

  // Collapse whitespace
  return text.replace(/\s+/g, " ").trim();
}

function extractTitle(html: string): string {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
  if (og) return og[1].trim();

  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (title) return title[1].trim();

  return "";
}

export class ContentExtractorService {
  constructor(
    private readonly timeoutMs: number,
    private readonly maxImages: number
  ) {}

  async extract(url: string): Promise<ExtractedContent> {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new UpstreamError("CONTENT_INVALID_URL", `Invalid URL: ${url}`, 400);
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new UpstreamError("CONTENT_INVALID_URL", "Only http/https URLs are supported", 400);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    let html: string;
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": BROWSER_UA,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9"
        },
        signal: controller.signal
      });

      const contentType = response.headers.get("content-type") ?? "";
      const looksLikeHtml = contentType.includes("html") || contentType.includes("xml") || contentType.includes("text") || contentType === "";

      if (!response.ok) {
        // For server errors, fail immediately
        if (response.status >= 500) {
          throw new UpstreamError("CONTENT_FETCH_ERROR", `URL returned HTTP ${response.status}`, 502);
        }
        // For client errors, try to read the body — some sites return 403/429 pages
        // with real HTML content that can still be analysed
        if (!looksLikeHtml) {
          const statusLabel =
            response.status === 403 ? "Forbidden" :
            response.status === 404 ? "Not Found" :
            response.status === 429 ? "Rate Limited" :
            `HTTP ${response.status}`;
          throw new UpstreamError("CONTENT_FETCH_ERROR", `URL returned ${statusLabel} (${response.status}) — cannot read content`, 422);
        }
        // Fall through and try to extract from the error page body
      } else if (!looksLikeHtml) {
        throw new UpstreamError("CONTENT_NOT_HTML", `URL does not return HTML (content-type: ${contentType})`, 422);
      }

      html = await response.text();

      // If we got in on a 4xx, make sure we actually got meaningful HTML
      if (!response.ok && html.length < 200) {
        throw new UpstreamError(
          "CONTENT_FETCH_ERROR",
          `URL returned HTTP ${response.status} with no usable content`,
          422
        );
      }
    } catch (error) {
      if (error instanceof UpstreamError) throw error;
      const err = error as Error;
      if (err.name === "AbortError") {
        throw new UpstreamError("CONTENT_TIMEOUT", `Content fetch timed out after ${this.timeoutMs}ms`, 504);
      }
      throw new UpstreamError("CONTENT_NETWORK_ERROR", `Failed to fetch URL: ${err.message}`, 502);
    } finally {
      clearTimeout(timeout);
    }

    const title = extractTitle(html);
    const text = extractText(html);
    const imageUrls = extractImages(html, url, this.maxImages);

    return {
      url,
      title,
      text,
      imageUrls,
      extractedAt: new Date().toISOString()
    };
  }
}
