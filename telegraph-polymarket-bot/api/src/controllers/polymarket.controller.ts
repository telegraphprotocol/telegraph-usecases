import { Request, Response } from 'express';
import { PolymarketService } from '../services/polymarket.service';
import { MARKET_MONITOR_CONFIG } from '../config/market-monitor.config';
import { MarketDecisionService } from '../services/market-decision.service';
import prisma from '../utils/prisma';

export const searchMarkets = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Keyword "q" is required' });
    }

    const markets = await PolymarketService.searchTopMarkets(q, MARKET_MONITOR_CONFIG.marketFetchLimit);
    const summary = markets.map(m => PolymarketService.formatMarketSummary(m as any));

    res.json({
      query: q,
      count: summary.length,
      markets: summary
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const runDecisionPipeline = async (_req: Request, res: Response) => {
  try {
    const result = await MarketDecisionService.runDecisionPipelineOnce('manual');
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to run decision pipeline' });
  }
};

export const getDecisionHistory = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const actionQuery = typeof req.query.action === 'string' ? req.query.action.toLowerCase() : undefined;
    const action = actionQuery === 'buy' || actionQuery === 'wait' ? actionQuery : undefined;
    const sortDir = req.query.sortDir === 'asc' ? 'asc' : 'desc';

    const sortByWhitelist = new Set(['createdAt', 'likelihood', 'keyword', 'marketTitle']);
    const sortBy =
      typeof req.query.sortBy === 'string' && sortByWhitelist.has(req.query.sortBy)
        ? req.query.sortBy
        : 'createdAt';

    const where = action ? { action } : {};
    const skip = (page - 1) * limit;
    const orderBy = { [sortBy]: sortDir } as Record<string, 'asc' | 'desc'>;

    const [items, total] = await Promise.all([
      prisma.decision.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      prisma.decision.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    res.json({
      items,
      page,
      limit,
      total,
      totalPages,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load decision history' });
  }
};
