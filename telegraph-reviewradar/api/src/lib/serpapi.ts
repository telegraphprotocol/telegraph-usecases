export type SerpReview = Record<string, unknown>;

export type AmazonProductPreview = {
  title: string | null;
  image: string | null;
  link: string | null;
  rating: number | null;
  reviewCount: number | null;
};

type SerpJson = Record<string, unknown> & {
  error?: string;
  product_results?: Record<string, unknown>;
  reviews_information?: {
    authors_reviews?: SerpReview[];
    other_countries_reviews?: SerpReview[];
  };
};

function extractProductPreview(data: SerpJson, asin: string): AmazonProductPreview {
  const pr = data.product_results;
  if (!pr || typeof pr !== "object") {
    return {
      title: null,
      image: null,
      link: `https://www.amazon.com/dp/${asin}`,
      rating: null,
      reviewCount: null,
    };
  }
  const p = pr as Record<string, unknown>;
  const title = typeof p.title === "string" ? p.title : null;
  let image: string | null = null;
  if (typeof p.thumbnail === "string" && p.thumbnail.length > 0) {
    image = p.thumbnail;
  } else if (Array.isArray(p.thumbnails)) {
    const first = p.thumbnails.find((t): t is string => typeof t === "string" && t.length > 0);
    image = first ?? null;
  }
  const link =
    typeof p.link_clean === "string" && p.link_clean.length > 0
      ? p.link_clean
      : typeof p.link === "string" && p.link.length > 0
        ? p.link
        : `https://www.amazon.com/dp/${asin}`;
  const rating = typeof p.rating === "number" ? p.rating : null;
  const reviewCount = typeof p.reviews === "number" ? p.reviews : null;
  return { title, image, link, rating, reviewCount };
}

export class SerpApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "SerpApiError";
  }
}

/** Single SerpApi amazon_product call: merged reviews + product preview fields. */
export async function fetchAmazonProductData(
  asin: string,
  apiKey: string,
): Promise<{ reviews: SerpReview[]; product: AmazonProductPreview }> {
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "amazon_product");
  url.searchParams.set("asin", asin);
  url.searchParams.set("api_key", apiKey);

  console.log(`[serpapi] GET ${url.toString().replace(apiKey, "***")}`);
  const res = await fetch(url);
  console.log(`[serpapi] HTTP ${res.status}`);
  const data = (await res.json()) as SerpJson;
  console.log(`[serpapi] top-level keys: ${Object.keys(data).join(", ")}`);

  if (typeof data.error === "string" && data.error.length > 0) {
    console.error(`[serpapi] API error: ${data.error}`);
    throw new SerpApiError(data.error, res.ok ? undefined : res.status);
  }

  if (!res.ok) {
    throw new SerpApiError(`SerpApi HTTP ${res.status}`, res.status);
  }

  const authors = Array.isArray(data.reviews_information?.authors_reviews)
    ? data.reviews_information.authors_reviews
    : [];
  const otherCountries = Array.isArray(data.reviews_information?.other_countries_reviews)
    ? data.reviews_information.other_countries_reviews
    : [];

  console.log(`[serpapi] authors_reviews=${authors.length}, other_countries_reviews=${otherCountries.length}`);
  if (authors.length === 0 && otherCountries.length === 0) {
    console.warn(`[serpapi] WARNING: no reviews found. reviews_information keys: ${Object.keys(data.reviews_information ?? {}).join(", ") || "(field missing)"}`);
    console.warn(`[serpapi] Full reviews_information:`, JSON.stringify(data.reviews_information, null, 2));
  }

  return {
    reviews: [...authors, ...otherCountries],
    product: extractProductPreview(data, asin),
  };
}
