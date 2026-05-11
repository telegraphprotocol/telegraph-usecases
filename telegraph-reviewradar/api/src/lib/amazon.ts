/** Extract 10-char ASIN from common Amazon product URL shapes. */
export function extractAsinFromUrl(input: string): string | null {
  let urlStr = input.trim();
  if (!urlStr) return null;

  try {
    if (!/^https?:\/\//i.test(urlStr)) {
      urlStr = `https://${urlStr}`;
    }
    const u = new URL(urlStr);
    const host = u.hostname.toLowerCase();
    if (!host.includes("amazon.")) return null;

    const q = u.searchParams.get("asin");
    if (q && /^[A-Z0-9]{10}$/i.test(q)) return q.toUpperCase();

    const path = u.pathname;
    const dp = path.match(/\/(?:dp|gp\/product|d)\/([A-Z0-9]{10})/i);
    if (dp?.[1]) return dp[1].toUpperCase();

    const asinPath = path.match(/\/([A-Z0-9]{10})(?:[/?#]|$)/i);
    if (asinPath?.[1] && /[A-Z]/i.test(asinPath[1]) && /\d/.test(asinPath[1])) {
      return asinPath[1].toUpperCase();
    }
  } catch {
    return null;
  }

  return null;
}
