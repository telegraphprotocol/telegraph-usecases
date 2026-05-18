import { GoogleAdsClient } from "../clients/googleAdsClient";
import type { CampaignGuardResult, ThreatAnalysis } from "../types";

export interface GuardConfig {
  customerId: string;
  campaignIds: string[];
  accessToken: string;
  threshold: number;
}

export class CampaignGuardService {
  constructor(private readonly gadsClient: GoogleAdsClient) {}

  async guard(analysis: ThreatAnalysis, config: GuardConfig): Promise<CampaignGuardResult> {
    const { customerId, campaignIds, accessToken, threshold } = config;
    const { threatScore } = analysis;
    const triggered = threatScore >= threshold && campaignIds.length > 0;

    if (!triggered) {
      return {
        triggered: false,
        threshold,
        threatScore,
        simulatedMode: false,
        actions: [],
        pausedCount: 0,
        failedCount: 0,
        reason: threatScore < threshold
          ? `Threat score ${threatScore}% is below threshold ${threshold}% — no action taken`
          : "No campaigns selected for protection"
      };
    }

    let actions = await this.gadsClient.pauseCampaigns(customerId, campaignIds, accessToken);

    // For campaigns not returned in the mutate response (e.g., already paused), fill with skipped
    const actionIds = new Set(actions.map((a) => a.campaignId));
    for (const id of campaignIds) {
      if (!actionIds.has(id)) {
        actions.push({ campaignId: id, campaignName: `Campaign ${id}`, resourceName: `customers/${customerId}/campaigns/${id}`, result: "skipped" });
      }
    }

    const simulatedMode = actions.some((a) => a.result === "simulated");
    const pausedCount = actions.filter((a) => a.result === "paused" || a.result === "simulated").length;
    const failedCount = actions.filter((a) => a.result === "failed").length;

    return {
      triggered: true,
      threshold,
      threatScore,
      simulatedMode,
      actions,
      pausedCount,
      failedCount,
      reason: `Threat score ${threatScore}% exceeded threshold ${threshold}% — ${pausedCount} campaign(s) paused`
    };
  }
}
