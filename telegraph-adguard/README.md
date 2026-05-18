# telegraph-adguard

**Ad-Spend Optimization Utility** — Detects trending deepfakes and AI-fabricated fake news via Telegraph subnets and automatically pauses sensitive Google Ads campaigns to protect brand integrity.

## How It Works

1. **Submit** — Paste any article or news page URL into the dashboard
2. **Analyze** — Telegraph's BitMind (subnet 34) scores every image for deepfakes; ItsAI (subnet 32) classifies the article text as AI-generated or human-written; each inference is paid via x402 on Solana
3. **Guard** — If the composite threat score exceeds your configured threshold, the selected Google Ads campaigns are paused automatically via the Google Ads API

## Subnets

| Subnet | ID | Capability |
|--------|-----|-----------|
| BitMind | 34 | Deepfake / AI-image detection (`POST /subnet-dispatcher/v1/34/detect-image`) |
| ItsAI | 32 | AI text / fake-news detection (`POST /subnet-dispatcher/v1/32/detect`) |

## Scoring

| Threat Score | Verdict | Default action |
|---|---|---|
| 0–39% | CLEAN | No action |
| 40–69% | SUSPICIOUS | No action (below default 70% threshold) |
| 70–100% | HIGH_THREAT | Pause selected campaigns |

Score is a weighted composite: **70% image signal + 30% text signal**.

## Project Structure

```
telegraph-adguard/
├── api/                         # Node.js / Express / TypeScript backend (port 3001)
│   └── src/
│       ├── clients/
│       │   ├── bitmindClient.ts        # BitMind subnet 34 HTTP client
│       │   ├── itsAiClient.ts          # ItsAI subnet 32 HTTP client
│       │   └── googleAdsClient.ts      # Google Ads REST API client
│       ├── services/
│       │   ├── contentExtractorService.ts  # Fetch URL, extract text + images
│       │   ├── threatAnalysisService.ts    # Orchestrate BitMind + ItsAI + scoring
│       │   └── campaignGuardService.ts     # Tie threat score to campaign pausing
│       ├── routes/
│       │   ├── scanRoute.ts            # POST /api/scan
│       │   └── campaignsRoute.ts       # GET /api/ads/campaigns
│       └── x402Fetch.ts                # x402 Solana payment fetch wrapper
└── frontend/                    # React 19 + Vite 8 SPA
    └── src/
        ├── pages/
        │   ├── LandingPage.jsx
        │   └── DashboardPage.jsx
        └── components/
            └── TerminalFeed.jsx
```

## Quick Start

### 1. Backend

```bash
cd api
npm install
cp .env.example .env
# Edit .env — set SOLANA_PRIVATE_KEY, optionally GOOGLE_ADS_DEVELOPER_TOKEN
# Set GOOGLE_ADS_SIMULATE=true for demo mode (no real Google Ads needed)
npm run dev
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

## Environment Variables

### Backend (`api/.env`)

| Variable | Required | Description |
|---|---|---|
| `TELEGRAPH_BASE_URL` | No | Telegraph subnet dispatcher (`http://54.252.48.30:7044`) |
| `SOLANA_PRIVATE_KEY` | No | Base58 keypair for x402 payments (leave blank = no payment) |
| `SOLANA_NETWORK` | No | `devnet` or `mainnet` |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Yes* | From Google Ads → Tools → API Center |
| `GOOGLE_ADS_SIMULATE` | No | Set `true` to mock campaign actions without real credentials |
| `PORT` | No | Default `3001` |

*Not needed when `GOOGLE_ADS_SIMULATE=true`

### Getting a Google Ads Access Token (for real mode)

1. Go to [Google OAuth Playground](https://developers.google.com/oauthplayground/)
2. Authorize scope: `https://www.googleapis.com/auth/adwords`
3. Exchange authorization code → access token
4. Paste the `access_token` into the dashboard's Access Token field
5. Enter your Google Ads Customer ID (digits only, no dashes)

## API Reference

### `POST /api/scan`

Scan an article URL and optionally pause campaigns.

**Request:**
```json
{
  "url": "https://example.com/article",
  "googleAdsToken": "ya29.a0...",
  "customerId": "1234567890",
  "campaignIds": ["1001", "1002"],
  "threshold": 70
}
```

**Response:**
```json
{
  "content": { "url", "title", "textLength", "imageCount", "analyzedImageCount", "extractedAt" },
  "analysis": {
    "images": [{ "url", "status", "isDeepfake", "confidence" }],
    "text": { "status", "isAiGenerated", "characterCount" },
    "threatScore": 85,
    "verdict": "HIGH_THREAT",
    "thresholdExceeded": true
  },
  "campaignGuard": {
    "triggered": true,
    "pausedCount": 2,
    "simulatedMode": false,
    "actions": [{ "campaignId", "campaignName", "result" }],
    "reason": "Threat score 85% exceeded threshold 70% — 2 campaign(s) paused"
  },
  "payment": {
    "bitmind": { "txHash", "network", "explorerUrl" },
    "itsai": { "txHash", "network", "explorerUrl" }
  }
}
```

### `GET /api/ads/campaigns?customerId=123`

List active Google Ads campaigns. Requires `Authorization: Bearer <token>` header.
