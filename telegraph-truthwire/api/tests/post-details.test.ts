import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { AppConfig } from "../src/config";

const testConfig: AppConfig = {
  vxApiBase: "https://api.vxtwitter.com",
  telegraphBaseUrl: "http://54.252.48.30:7044",
  bitmindSubnetPrefix: "/subnet-dispatcher/v1/34",
  bitmindRequestTimeoutMs: 5000,
  itsAiSubnetPrefix: "/subnet-dispatcher/v1/32",
  itsAiRequestTimeoutMs: 5000
};

describe("POST /api/x/post-details (validation)", () => {
  it("returns 400 for invalid URL", async () => {
    const app = createApp(testConfig);

    const response = await request(app)
      .post("/api/x/post-details")
      .send({ url: "not-a-url" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_INPUT");
  });

  it("returns 400 when url is missing", async () => {
    const app = createApp(testConfig);

    const response = await request(app)
      .post("/api/x/post-details")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_INPUT");
  });

  it("returns 400 for non-X URLs", async () => {
    const app = createApp(testConfig);

    const response = await request(app)
      .post("/api/x/post-details")
      .send({ url: "https://example.com/status/1234567890" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_INPUT");
  });
});
