import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { route } from "../src/router.js";
import { loadConfig } from "../src/config.js";
import { resetStorageForTests } from "../src/storage/index.js";

function freshConfig() {
  process.env.AI_MODE = "mock";
  process.env.STORAGE_BACKEND = "memory";
  process.env.CORS_ORIGIN = "*";
  resetStorageForTests();
  return loadConfig();
}

describe("router", () => {
  it("returns 404 for unknown routes", async () => {
    const config = freshConfig();
    const res = await route(
      { method: "GET", path: "/nope", query: {}, body: null },
      config,
    );
    assert.equal(res.status, 404);
  });

  it("health check responds ok", async () => {
    const config = freshConfig();
    const res = await route(
      { method: "GET", path: "/health", query: {}, body: null },
      config,
    );
    assert.equal(res.status, 200);
    const parsed = JSON.parse(res.body) as { status: string; aiMode: string };
    assert.equal(parsed.status, "ok");
    assert.equal(parsed.aiMode, "mock");
  });

  it("POST /analyze/text validates input", async () => {
    const config = freshConfig();
    const res = await route(
      { method: "POST", path: "/analyze/text", query: {}, body: {} },
      config,
    );
    assert.equal(res.status, 400);
  });

  it("POST /analyze/text returns a report with trust score", async () => {
    const config = freshConfig();
    const text =
      "Studies show that this miracle cure is 100% guaranteed and absolutely true. Act now! Experts say doctors hate it.";
    const res = await route(
      {
        method: "POST",
        path: "/analyze/text",
        query: {},
        body: { text },
      },
      config,
    );
    assert.equal(res.status, 200);
    const report = JSON.parse(res.body) as {
      id: string;
      trustScore: number;
      riskFlags: Array<{ code: string; severity: string }>;
      disclaimer: string;
      aiMode: string;
    };
    assert.ok(typeof report.id === "string" && report.id.length > 0);
    assert.ok(report.trustScore >= 0 && report.trustScore <= 100);
    assert.ok(report.riskFlags.length > 0, "should flag risky text");
    assert.match(report.disclaimer, /risk-analysis tool/i);
    assert.equal(report.aiMode, "mock");
  });

  it("GET /reports returns the saved report", async () => {
    const config = freshConfig();
    await route(
      {
        method: "POST",
        path: "/analyze/text",
        query: {},
        body: { text: "This is a perfectly normal and calm sentence." },
      },
      config,
    );
    const res = await route(
      { method: "GET", path: "/reports", query: {}, body: null },
      config,
    );
    assert.equal(res.status, 200);
    const body = JSON.parse(res.body) as { total: number };
    assert.ok(body.total >= 1);
  });

  it("POST /analyze/url rejects private addresses", async () => {
    const config = freshConfig();
    const res = await route(
      {
        method: "POST",
        path: "/analyze/url",
        query: {},
        body: { url: "http://127.0.0.1/" },
      },
      config,
    );
    assert.equal(res.status, 400);
  });

  it("OPTIONS returns CORS headers", async () => {
    const config = freshConfig();
    const res = await route(
      { method: "OPTIONS", path: "/analyze/text", query: {}, body: null },
      config,
    );
    assert.equal(res.status, 204);
    assert.ok(res.headers["Access-Control-Allow-Origin"]);
  });
});

describe("mock AI scoring", () => {
  it("scores benign content higher than risky content", async () => {
    const config = freshConfig();
    const benign = await route(
      {
        method: "POST",
        path: "/analyze/text",
        query: {},
        body: {
          text:
            "The quarterly earnings report was published on the company's investor relations page. Revenue grew 4% year over year, according to the filing.",
        },
      },
      config,
    );
    const risky = await route(
      {
        method: "POST",
        path: "/analyze/text",
        query: {},
        body: {
          text:
            "THIS IS 100% GUARANTEED!!! Doctors hate this miracle cure!!! They don't want you to know! Act now, limited time!!!",
        },
      },
      config,
    );
    const b = JSON.parse(benign.body) as { trustScore: number };
    const r = JSON.parse(risky.body) as { trustScore: number };
    assert.ok(
      b.trustScore > r.trustScore,
      `benign score (${b.trustScore}) should exceed risky score (${r.trustScore})`,
    );
  });
});
