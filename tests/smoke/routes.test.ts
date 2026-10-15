import { afterAll, beforeAll, expect, it } from "vitest";
import { startProdServer } from "./server";

// One row per route: what a visitor's GET must answer, and the key text the page
// must show. Adding a route extends this table, not the test logic.
const ROUTES: { path: string; status: number; contains: string }[] = [
  { path: "/", status: 200, contains: "Systems that shipped." },
  { path: "/projects", status: 200, contains: "All projects" },
  { path: "/projects/marketfeed-lakehouse", status: 200, contains: "MarketFeed Lakehouse" },
  { path: "/projects/fineract-analytics-platform", status: 200, contains: "Fineract Analytics Platform" },
  { path: "/projects/signaltel-churn-intelligence", status: 200, contains: "SignalTel Churn Intelligence" },
  { path: "/projects/tembo-hotel-analysis", status: 200, contains: "Tembo Hotel Analysis" },
  { path: "/about", status: 200, contains: "unglamorous parts of data" },
  { path: "/experience", status: 200, contains: "The story so far" },
  { path: "/resume", status: 200, contains: "One page, all signal" },
  { path: "/contact", status: 200, contains: "gatekeeping" },
  { path: "/nowhere", status: 404, contains: "No rows returned for this route" },
];

// Set SMOKE_BASE_URL to skip the local server and sweep a site that is already
// running, such as the live deployment. The route table stays the same either way.
const externalBase = process.env.SMOKE_BASE_URL?.replace(/\/+$/, "");

let base = externalBase ?? "";
let stop: (() => Promise<void>) | undefined;

beforeAll(async () => {
  if (!externalBase) {
    const server = await startProdServer();
    base = server.base;
    stop = server.stop;
  }
});

afterAll(async () => {
  await stop?.();
});

it.each(ROUTES)("GET $path answers $status with its key text", async ({ path, status, contains }) => {
  const res = await fetch(`${base}${path}`);
  expect(res.status).toBe(status);
  expect(await res.text()).toContain(contains);
});
