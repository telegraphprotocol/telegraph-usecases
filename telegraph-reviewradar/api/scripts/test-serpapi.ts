import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const DEFAULT_ASIN = "B07VFY4MXM";

type SerpJson = Record<string, unknown> & {
  error?: string;
  reviews_information?: {
    authors_reviews?: unknown[];
    other_countries_reviews?: unknown[];
  };
};

function usage(): void {
  console.error(
    "Usage: npm run test:serpapi -- [ASIN]\n" + `  ASIN defaults to ${DEFAULT_ASIN}. Reads SERP_API_KEY from api/.env.`,
  );
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv[0] === "-h" || argv[0] === "--help") {
    usage();
    process.exit(0);
  }

  const apiKey = process.env.SERP_API_KEY?.trim();
  if (!apiKey) {
    console.error("Set SERP_API_KEY in api/.env");
    process.exit(1);
  }

  const asin = (argv[0] ?? DEFAULT_ASIN).trim().toUpperCase();
  if (!/^[A-Z0-9]{10}$/.test(asin)) {
    console.error("ASIN should be a 10-character alphanumeric code (e.g. B07VFY4MXM).");
    process.exit(1);
  }

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "amazon_product");
  url.searchParams.set("asin", asin);
  url.searchParams.set("api_key", apiKey);

  const res = await fetch(url);
  const data = (await res.json()) as SerpJson;

  if (typeof data.error === "string" && data.error.length > 0) {
    console.error("SerpApi error:", data.error);
    process.exit(1);
  }

  if (!res.ok) {
    console.error("HTTP", res.status, JSON.stringify(data, null, 2));
    process.exit(1);
  }

  const authors = Array.isArray(data.reviews_information?.authors_reviews)
    ? data.reviews_information.authors_reviews
    : [];
  const otherCountries = Array.isArray(data.reviews_information?.other_countries_reviews)
    ? data.reviews_information.other_countries_reviews
    : [];
  const allReviews = [...authors, ...otherCountries];

  console.log(
    JSON.stringify(
      {
        asin,
        total_reviews: allReviews.length,
        note: "SerpApi amazon_product returns available review arrays from product data.",
        reviews: allReviews,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
