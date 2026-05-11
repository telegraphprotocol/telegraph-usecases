# TrustFilter — API

Backend service for **TrustFilter**, a use case built on the [Telegraph](https://telegraph.ai) platform. It analyzes phone numbers and SMS messages for scam patterns by calling the **Groq LLM subnet** on Telegraph, paying for each inference call on-chain via the [x402](https://x402.org) protocol on Solana.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [How x402 Payments Work](#how-x402-payments-work)
- [Telegraph Subnet](#telegraph-subnet)
- [Using the Telegraph Groq Subnet Directly](#using-the-telegraph-groq-subnet-directly)

---

## Overview

| Concern | Detail |
|---|---|
| Runtime | Node.js (CommonJS) |
| Language | TypeScript |
| Framework | Express 5 |
| Validation | Zod |
| Payment | x402 / Solana SVM |
| Default port | 3006 |

---

## Architecture

```
Client
  │
  ▼
Express API (port 3006)
  │
  └─ POST /api/analyze
        │
        └─ Groq LLM Client   (Telegraph subnet 102 — scam pattern analysis)
              └─ x402 fetch  (pays micro-fee on Solana, captures tx hash)
```

The service builds a structured scam-detection prompt from the supplied phone number and/or message text, sends it to the Groq LLM subnet on Telegraph, and parses the JSON response into a typed verdict. Each call is paid automatically via x402.

---

## API Reference

### `GET /health`

Liveness probe.

**Response `200`**
```json
{ "ok": true }
```

---

### `POST /api/analyze`

Analyzes a phone number, an SMS/message body, or both for scam indicators.

**Request body** — at least one field is required.

```json
{
  "phone": "+1-800-123-4567",
  "message": "Congratulations! You've won a $1,000 gift card. Click here to claim."
}
```

**Response `200`**
```json
{
  "verdict": "scam",
  "confidence": 0.95,
  "summary": "Multiple high-confidence scam indicators detected.",
  "reasons": [
    "Unsolicited prize claim with no prior context",
    "Urgency language designed to pressure immediate action"
  ],
  "redFlags": [
    "You've won a $1,000 gift card",
    "Click here to claim"
  ],
  "txHash": "5KtY3...abc"
}
```

**Response fields**

| Field | Type | Description |
|---|---|---|
| `verdict` | `"scam" \| "suspicious" \| "likely_safe"` | Overall classification |
| `confidence` | `number` (0–1) | Model confidence in the verdict |
| `summary` | `string` | One-sentence verdict summary from the model |
| `reasons` | `string[]` | 2–5 reasoning points from the model |
| `redFlags` | `string[]` | Specific phrases or patterns flagged as suspicious. Empty array if none. |
| `txHash` | `string \| null` | Solana transaction hash for the x402 payment. `null` if no payment was required or `SOLANA_PRIVATE_KEY` is not set. |

**Verdict definitions**

| Verdict | Meaning |
|---|---|
| `scam` | Strong indicators of fraudulent intent |
| `suspicious` | Some concerning patterns but not conclusive |
| `likely_safe` | No significant scam signals found |

**Error responses**

| Status | Meaning |
|---|---|
| 400 | Neither `phone` nor `message` was provided, or both fields are empty strings |
| 502 | Telegraph Groq subnet returned an error or unparseable response |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the required values.

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3006` | Port the HTTP server binds to |
| `TELEGRAPH_BASE_URL` | No | see `.env.example` | Telegraph subnet-dispatcher host. Must use port 7044 — port 80 is nginx and returns 405. |
| `GROQ_SUBNET_PATH` | No | `/subnet-dispatcher/v1/102/chat` | Path to the Groq LLM subnet on the dispatcher |
| `GROQ_REQUEST_TIMEOUT_MS` | No | `30000` | Request timeout in milliseconds for Groq subnet calls |
| `SOLANA_PRIVATE_KEY` | Yes* | — | Base58-encoded Solana private key for signing x402 payments. Without this the request proceeds unpaid and may be rejected. |
| `SOLANA_NETWORK` | No | `devnet` | Set to `mainnet` for production |
| `FRONTEND_ORIGIN` | No | `http://localhost:5174` | Allowed CORS origin. Use a comma-separated list for multiple origins. |

---

## Getting Started

### Prerequisites

- Node.js 20+
- A Solana wallet funded with devnet SOL and devnet USDC for x402 payments

### Install

```bash
cd api
npm install
```

### Configure

```bash
cp .env.example .env
# Edit .env — at minimum, set SOLANA_PRIVATE_KEY
```

### Run (development)

```bash
npm run dev
```

Server starts on `http://localhost:3006`. Hot-reloads via `tsx`.

### Build & run (production)

```bash
npm run build   # compiles TypeScript to dist/
npm start       # builds then runs dist/server.js
```

---

## Project Structure

```
api/
└── src/
    ├── server.ts                  # Entry point — binds HTTP server
    ├── app.ts                     # Express app factory, wires routes and services
    ├── config.ts                  # Reads and validates environment variables
    ├── types.ts                   # Shared interfaces (AnalyzeRequest, AnalyzeResult, ScamVerdict)
    ├── loadLocalEnv.ts            # Loads .env in development
    ├── x402Fetch.ts               # x402 payment-wrapped fetch factory + tx capture
    ├── routes/
    │   └── analyzeRoute.ts        # POST /api/analyze — validation and response
    └── services/
        └── scamAnalysisService.ts # Builds prompt, calls Groq subnet, parses verdict
```

---

## How x402 Payments Work

The x402 protocol enables HTTP-native micropayments. When a subnet requires payment it returns `402 Payment Required`; the x402 client automatically signs and submits a Solana transaction, then retries the request.

In this service:

1. **`createPaymentFetch()`** initialises a Solana keypair from `SOLANA_PRIVATE_KEY` and wraps the global `fetch` with x402 payment logic via `@x402/fetch` and `@x402/svm`.
2. A **`PaymentCapture`** object is created per request to intercept the `payment-response` response header and extract the Solana transaction hash after settlement.
3. The `txHash` is returned in the API response as proof that the inference was paid for on-chain.

If `SOLANA_PRIVATE_KEY` is not set, the service falls back to plain `fetch` and logs a warning.

---

## Telegraph Subnet

| Subnet | ID | Path | Purpose |
|---|---|---|---|
| Groq LLM | 102 | `POST /subnet-dispatcher/v1/102/chat` | LLM inference via Groq. Accepts an OpenAI-compatible `messages` payload. Returns `choices[0].message.content` as the model response. |

The request payload follows the OpenAI chat completions format:

```json
{
  "model": "gpt-4o-mini",
  "messages": [{ "role": "user", "content": "<prompt>" }],
  "max_tokens": 512
}
```

The service instructs the model to return a strict JSON object with `verdict`, `confidence`, `summary`, `reasons`, and `redFlags` — no markdown or code fences. The response is cleaned and parsed; any fence wrapping is stripped before `JSON.parse`.

---

## Using the Telegraph Groq Subnet Directly

The Groq LLM subnet accepts any OpenAI-compatible chat completion request. You can call it from your own service without TrustFilter.

### What you need

- A Solana wallet funded with devnet SOL and devnet USDC
- `SOLANA_PRIVATE_KEY` (base58-encoded) for signing x402 payments
- For Node.js: `npm install @x402/fetch @x402/svm @solana/kit @scure/base`

### How to integrate

1. **Initialise the x402 payment client** using `@x402/fetch` and `@x402/svm`. Load your Solana keypair, register the SVM exact scheme, and wrap `fetch` with `wrapFetchWithPayment`. Reuse this across all calls in your process.

2. **POST to the subnet path** (relative to `TELEGRAPH_BASE_URL`) with an OpenAI-compatible body — `model`, `messages`, and optionally `max_tokens`. The x402 client handles any `402` response automatically.

3. **Read the response** from `choices[0].message.content`. The subnet returns the raw LLM output; structure your prompt to get back predictable output (e.g. strict JSON).

4. **Capture the transaction hash** from the `payment-response` response header if you need proof of payment. The header is base64-encoded JSON — decode it and extract `transaction`, `tx`, or `signature`.

5. **Set a timeout.** LLM inference can take several seconds. Use `AbortController` with a 30 s timeout and retry on `503`.

For Python or other languages, the x402 SDK is JavaScript-first. The simplest approach is to run the TrustFilter Node.js API as a sidecar and call `/api/analyze` from your service.

### Common errors

| HTTP status | Likely cause | Fix |
|---|---|---|
| `402 Payment Required` | No payment provided | Wrap fetch with x402 client and a funded keypair |
| `405 Method Not Allowed` | Wrong port — hitting port 80 (nginx) | Ensure `TELEGRAPH_BASE_URL` includes port 7044 |
| `503` / timeout | Subnet node slow or unavailable | Increase timeout; retry with backoff |
| Empty or non-JSON model output | Prompt did not constrain the output format | Instruct the model to return only strict JSON with no markdown |
