import { formatFetchError, UpstreamError } from "../errors";
import type { CampaignAction, GoogleAdsCampaign } from "../types";

export interface GoogleAdsClientOptions {
  baseUrl: string;
  developerToken: string;
  simulateMode?: boolean;
}

interface GadsSearchResult {
  results?: Array<{
    campaign?: {
      resourceName?: string;
      id?: string;
      name?: string;
      status?: string;
    };
  }>;
}

interface GadsMutateResult {
  results?: Array<{
    resourceName?: string;
  }>;
  partialFailureError?: {
    message?: string;
  };
}

export class GoogleAdsClient {
  private readonly baseUrl: string;
  private readonly developerToken: string;
  private readonly simulateMode: boolean;

  constructor(opts: GoogleAdsClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.developerToken = opts.developerToken;
    this.simulateMode = opts.simulateMode ?? false;
  }

  private headers(accessToken: string): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "developer-token": this.developerToken
    };
  }

  async listCampaigns(customerId: string, accessToken: string): Promise<GoogleAdsCampaign[]> {
    if (this.simulateMode) {
      return this.simulatedCampaigns(customerId);
    }

    const url = `${this.baseUrl}/v18/customers/${customerId}/googleAds:search`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: this.headers(accessToken),
        body: JSON.stringify({
          query: "SELECT campaign.id, campaign.name, campaign.status FROM campaign WHERE campaign.status != 'REMOVED' ORDER BY campaign.name LIMIT 50"
        })
      });
    } catch (error) {
      throw new UpstreamError("GADS_NETWORK_ERROR", `Network error calling Google Ads API: ${formatFetchError(error)}`, 502);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const hint = response.status === 401
        ? " — access token expired or missing Ads scope"
        : response.status === 403
          ? " — developer token not approved or invalid"
          : "";
      throw new UpstreamError(
        "GADS_HTTP_ERROR",
        `Google Ads API returned HTTP ${response.status}${hint}${body ? `: ${body.slice(0, 300)}` : ""}`,
        response.status === 401 ? 401 : 502
      );
    }

    const data = (await response.json()) as GadsSearchResult;
    return (data.results ?? []).map((r) => ({
      resourceName: r.campaign?.resourceName ?? "",
      id: r.campaign?.id ?? "",
      name: r.campaign?.name ?? "(unnamed)",
      status: r.campaign?.status ?? "UNKNOWN"
    }));
  }

  async pauseCampaigns(
    customerId: string,
    campaignIds: string[],
    accessToken: string
  ): Promise<CampaignAction[]> {
    if (this.simulateMode) {
      return campaignIds.map((id) => ({
        campaignId: id,
        campaignName: `Campaign ${id}`,
        resourceName: `customers/${customerId}/campaigns/${id}`,
        result: "simulated"
      }));
    }

    if (campaignIds.length === 0) return [];

    const operations = campaignIds.map((id) => ({
      update: {
        resourceName: `customers/${customerId}/campaigns/${id}`,
        status: "PAUSED"
      },
      updateMask: "status"
    }));

    const url = `${this.baseUrl}/v18/customers/${customerId}/campaigns:mutate`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: this.headers(accessToken),
        body: JSON.stringify({ operations })
      });
    } catch (error) {
      throw new UpstreamError("GADS_NETWORK_ERROR", `Network error pausing campaigns: ${formatFetchError(error)}`, 502);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new UpstreamError(
        "GADS_MUTATE_ERROR",
        `Google Ads mutate returned HTTP ${response.status}${body ? `: ${body.slice(0, 300)}` : ""}`,
        502
      );
    }

    const data = (await response.json()) as GadsMutateResult;
    const succeeded = new Set((data.results ?? []).map((r) => {
      const parts = (r.resourceName ?? "").split("/");
      return parts[parts.length - 1];
    }));

    return campaignIds.map((id) => ({
      campaignId: id,
      campaignName: `Campaign ${id}`,
      resourceName: `customers/${customerId}/campaigns/${id}`,
      result: succeeded.has(id) ? "paused" : "failed",
      error: succeeded.has(id) ? undefined : data.partialFailureError?.message
    }));
  }

  private simulatedCampaigns(customerId: string): GoogleAdsCampaign[] {
    return [
      { resourceName: `customers/${customerId}/campaigns/1001`, id: "1001", name: "Brand Awareness Q3", status: "ENABLED" },
      { resourceName: `customers/${customerId}/campaigns/1002`, id: "1002", name: "Product Launch — Spring", status: "ENABLED" },
      { resourceName: `customers/${customerId}/campaigns/1003`, id: "1003", name: "Retargeting — High Intent", status: "ENABLED" },
      { resourceName: `customers/${customerId}/campaigns/1004`, id: "1004", name: "Competitor Keywords", status: "PAUSED" },
      { resourceName: `customers/${customerId}/campaigns/1005`, id: "1005", name: "Display Network — Broad", status: "ENABLED" }
    ];
  }
}
