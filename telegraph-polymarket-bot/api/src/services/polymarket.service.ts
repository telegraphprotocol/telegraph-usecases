import axios from 'axios';
import { MARKET_MONITOR_CONFIG } from '../config/market-monitor.config';

export interface PolymarketEvent {
  id: string;
  title: string;
  ticker: string;
  slug: string;
  description: string;
  startDate: string;
  endDate: string;
  image: string;
  icon: string;
  active: boolean;
  closed: boolean;
  liquidity: number;
  volume: number;
  markets: any[];
}

const polymarketAxios = axios.create({
  baseURL: 'https://gamma-api.polymarket.com',
  timeout: 15000,
  headers: { 'User-Agent': 'Mozilla/5.0 (verified-sniper-bot)' },
  // Never throw on HTTP errors — handle status codes manually
  validateStatus: () => true,
});

export class PolymarketService {
  private static MIN_RELEVANCE_SCORE = 1;
  private static IRRELEVANT_TERMS = ['overwatch', 'bo3', 'gaming', 'esports', 'stage'];

  static async searchTopMarkets(keyword: string, limit = MARKET_MONITOR_CONFIG.marketFetchLimit): Promise<PolymarketEvent[]> {
    const safeLimit = Math.max(1, Math.min(limit, 3));

    try {
      // ── Step 1: public-search ────────────────────────────────────────────
      const queryVariants = this.buildQueryVariants(keyword);
      const publicSearchCandidates = await this.fetchPublicSearch(queryVariants, MARKET_MONITOR_CONFIG.marketFetchCandidateLimit);

      const activeRelevant = publicSearchCandidates
        .filter(e => e?.active && !e?.closed)
        .filter(e => this.relevanceScore(keyword, e) >= this.MIN_RELEVANCE_SCORE)
        .sort((a, b) => (b.liquidity || 0) - (a.liquidity || 0));

      if (activeRelevant.length >= safeLimit) {
        return activeRelevant.slice(0, safeLimit);
      }

      // ── Step 2: targeted events endpoint as fallback ─────────────────────
      const selectedKeys = new Set(activeRelevant.map(e => e.id || e.slug || e.title));
      const finalMarkets = [...activeRelevant];

      const eventsFallback = await this.fetchEventsByKeyword(keyword);
      for (const event of eventsFallback) {
        if (finalMarkets.length >= safeLimit) break;
        const key = event.id || event.slug || event.title;
        if (!key || selectedKeys.has(key)) continue;
        selectedKeys.add(key);
        finalMarkets.push(event);
      }

      return finalMarkets;

    } catch (error: any) {
      const status = error?.response?.status;
      const detail = status ? `HTTP ${status}` : error.message;
      console.error(`Polymarket search failed for keyword "${keyword}": ${detail}`);
      return [];
    }
  }

  private static async fetchPublicSearch(queryVariants: string[], candidateLimit: number): Promise<PolymarketEvent[]> {
    const allCandidates: PolymarketEvent[] = [];
    const seenIds = new Set<string>();

    for (const query of queryVariants) {
      try {
        const response = await polymarketAxios.get('/public-search', {
          params: { q: query, limit: candidateLimit },
        });

        if (response.status !== 200) {
          console.warn(`public-search returned HTTP ${response.status} for query "${query}"`);
          continue;
        }

        for (const event of response.data?.events || []) {
          const key = event?.id || event?.slug || event?.title;
          if (!key || seenIds.has(key)) continue;
          seenIds.add(key);
          allCandidates.push(event);
        }
      } catch (err: any) {
        console.warn(`public-search request failed for query "${query}": ${err.message}`);
      }
    }

    return allCandidates;
  }

  private static async fetchEventsByKeyword(keyword: string): Promise<PolymarketEvent[]> {
    try {
      // Use public-search with a larger limit rather than fetching all events
      const response = await polymarketAxios.get('/public-search', {
        params: { q: keyword, limit: 50 },
      });

      if (response.status !== 200) {
        console.warn(`events fallback returned HTTP ${response.status} for keyword "${keyword}"`);
        return [];
      }

      const events: PolymarketEvent[] = response.data?.events || [];
      const keywordTerms = keyword.toLowerCase().split(/\s+/).filter(Boolean);

      return events
        .filter(e => e?.active && !e?.closed)
        .filter(e => {
          const text = `${e?.title || ''} ${e?.description || ''}`.toLowerCase();
          return keywordTerms.some(term => text.includes(term));
        })
        .sort((a, b) => (b.liquidity || 0) - (a.liquidity || 0));
    } catch (err: any) {
      console.warn(`events fallback failed for keyword "${keyword}": ${err.message}`);
      return [];
    }
  }

  static formatMarketSummary(event: PolymarketEvent) {
    const markets = Array.isArray(event.markets) ? event.markets : [];
    const parseOutcomePrices = (market: any): [string, string] | null => {
      if (!market?.outcomePrices) return null;
      try {
        const prices = typeof market.outcomePrices === 'string' ? JSON.parse(market.outcomePrices) : market.outcomePrices;
        if (!Array.isArray(prices) || prices.length < 2) return null;
        return [String(prices[0]), String(prices[1])];
      } catch {
        return null;
      }
    };
    const marketLiquidity = (market: any) => {
      const numeric = Number(market?.liquidityNum ?? market?.liquidity ?? 0);
      return Number.isFinite(numeric) ? numeric : 0;
    };
    const rankMarket = (market: any) => {
      const activeOpen = market?.active === true && market?.closed !== true ? 1 : 0;
      const acceptingOrders = market?.acceptingOrders === true ? 1 : 0;
      const hasPrices = parseOutcomePrices(market) ? 1 : 0;
      return [activeOpen, acceptingOrders, hasPrices, marketLiquidity(market)] as const;
    };
    const sortedMarkets = [...markets].sort((a, b) => {
      const left = rankMarket(a);
      const right = rankMarket(b);
      for (let i = 0; i < left.length; i += 1) {
        if (right[i] !== left[i]) return right[i] - left[i];
      }
      return 0;
    });
    const mainMarket = sortedMarkets[0] || null;
    const [yesRaw, noRaw] = mainMarket ? parseOutcomePrices(mainMarket) || ['0', '0'] : ['0', '0'];
    const formatCents = (raw: string) => {
      const value = Number(raw);
      if (!Number.isFinite(value)) return 'N/A';
      const cents = value * 100;
      const formatted = cents.toFixed(cents < 1 ? 2 : 1).replace(/\.0$/, '').replace(/(\.\d*[1-9])0$/, '$1');
      return `${formatted}¢`;
    };

    return {
      title: event.title,
      slug: event.slug,
      liquidity: `$${(event.liquidity || 0).toLocaleString()}`,
      volume: `$${(event.volume || 0).toLocaleString()}`,
      yesPrice: formatCents(yesRaw),
      noPrice: formatCents(noRaw),
      url: `https://polymarket.com/event/${event.slug}`,
      active: event.active && !event.closed,
    };
  }

  private static buildQueryVariants(keyword: string): string[] {
    const base = keyword.trim();
    const variants = [base];
    const lower = base.toLowerCase();

    if (lower.includes('fuel') || lower.includes('oil') || lower.includes('gas')) {
      variants.push(`${base} oil`, `${base} energy`, 'oil price');
    }

    return [...new Set(variants)];
  }

  private static relevanceScore(keyword: string, event: PolymarketEvent): number {
    const text = `${event?.title || ''} ${event?.description || ''}`.toLowerCase();
    const keywordTerms = keyword.toLowerCase().split(/\s+/).filter(Boolean);
    let score = 0;

    for (const term of keywordTerms) {
      if (text.includes(term)) score += 1;
    }

    for (const blocked of this.IRRELEVANT_TERMS) {
      if (text.includes(blocked)) score -= 5;
    }

    return score;
  }
}
