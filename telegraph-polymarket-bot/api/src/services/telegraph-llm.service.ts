import { MARKET_MONITOR_CONFIG } from '../config/market-monitor.config';
import { RelatedNewsItem } from './telegraph-news.service';
import { getX402Fetch, extractTxHash } from '../utils/x402Fetch';

export interface LlmDecision {
  action: 'buy' | 'wait';
  token: 'YES' | 'NO' | null;
  likelihood: number;
  reason: string;
  llmTxHash: string | null;
}

const fallbackDecision = (reason: string): LlmDecision => ({
  action: 'wait',
  token: null,
  likelihood: 0,
  reason,
  llmTxHash: null,
});

const normalizeAction = (action: unknown): 'buy' | 'wait' | null => {
  if (typeof action !== 'string') return null;
  const normalized = action.toLowerCase();
  if (normalized === 'buy' || normalized === 'wait') return normalized;
  return null;
};

const normalizeToken = (token: unknown): 'YES' | 'NO' | null => {
  if (token === null || token === undefined) return null;
  if (typeof token !== 'string') return null;
  const normalized = token.toUpperCase();
  if (normalized === 'YES' || normalized === 'NO') return normalized;
  return null;
};

const cleanJsonPayload = (raw: string) => {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  return raw.trim();
};

export class TelegraphLlmService {
  static async decideMarketAction(params: {
    keyword: string;
    market: { title: string; slug: string; yesPrice: string; noPrice: string; liquidity: string; volume: string };
    relatedNews: RelatedNewsItem[];
  }): Promise<LlmDecision> {
    const url = `${MARKET_MONITOR_CONFIG.telegraphBaseUrl}${MARKET_MONITOR_CONFIG.llmChatPath}`;
    const newsContext =
      params.relatedNews.length > 0
        ? params.relatedNews.map((item, idx) => `${idx + 1}. ${item.summary}`).join('\n')
        : 'No related news found.';

    const prompt = [
      `Keyword: ${params.keyword}`,
      `Market title: ${params.market.title}`,
      `Market slug: ${params.market.slug}`,
      `YES price: ${params.market.yesPrice}`,
      `NO price: ${params.market.noPrice}`,
      `Liquidity: ${params.market.liquidity}`,
      `Volume: ${params.market.volume}`,
      'Related news:',
      newsContext,
      'Return strictly valid JSON with schema:',
      '{"action":"buy|wait","token":"YES|NO|null","likelihood":0-1,"reason":"short explanation"}',
      'If uncertain, choose wait.',
    ].join('\n');

    try {
      const fetchWithPayment = await getX402Fetch();
      const response = await fetchWithPayment(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 250,
        }),
        signal: AbortSignal.timeout(25000),
      });

      const llmTxHash = extractTxHash(response.headers);

      if (!response.ok) {
        if (response.status === 402) {
          console.error(`Telegraph LLM payment failed for "${params.market.title}": check ADMIN_EVM_PRIVATE_KEY and Base mainnet USDC balance`);
          return { ...fallbackDecision('x402 payment failed for LLM call'), llmTxHash };
        }
        return fallbackDecision(`LLM request failed: HTTP ${response.status}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content || typeof content !== 'string') {
        return { ...fallbackDecision('LLM returned empty content'), llmTxHash };
      }

      let parsed: any;
      try {
        parsed = JSON.parse(cleanJsonPayload(content));
      } catch {
        return { ...fallbackDecision('LLM output was not valid JSON'), llmTxHash };
      }

      const action = normalizeAction(parsed.action);
      if (!action) return { ...fallbackDecision('LLM action was invalid'), llmTxHash };

      const token = normalizeToken(parsed.token);
      const likelihoodNumber = Number(parsed.likelihood);
      const likelihood = Number.isFinite(likelihoodNumber)
        ? Math.max(0, Math.min(1, likelihoodNumber))
        : 0;
      const reason =
        typeof parsed.reason === 'string' && parsed.reason.trim().length > 0
          ? parsed.reason.trim()
          : 'No reason provided by LLM';

      return {
        action,
        token: action === 'buy' ? token : null,
        likelihood,
        reason,
        llmTxHash,
      };
    } catch (error: any) {
      console.error(`Telegraph LLM decision failed for "${params.market.title}":`, error.message);
      return fallbackDecision(`LLM request failed: ${error.message}`);
    }
  }
}

