import { spawn } from "child_process";
import http from "http";

function check() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["scripts/check-hero-chart.mjs", "http://127.0.0.1:3311/", "--cdp", "http://127.0.0.1:9222"],
      { stdio: "inherit" }
    );
    child.on("close", (code) => resolve(code));
    child.on("error", reject);
  });
}

async function waitFor(url, maxMs) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      await new Promise((resolve, reject) => {
        http.get(url, (res) => {
          if (res.statusCode === 200) resolve();
          else reject();
        }).on("error", reject);
      });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`timeout waiting for ${url}`);
}

async function startServer() {
  const child = spawn(
    "npx",
    ["next", "start", "-p", "3311"],
    { stdio: "pipe", detached: true }
  );
  await waitFor("http://127.0.0.1:3311/", 120000);
  return child;
}

async function startChrome() {
  const child = spawn(
    "google-chrome",
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--remote-debugging-port=9222",
      "--remote-allow-origins=*",
      "about:blank",
    ],
    { stdio: "pipe", detached: true }
  );
  await waitFor("http://127.0.0.1:9222/json/version", 60000);
  return child;
}

async function main() {
  const server = await startServer();
  const chrome = await startChrome();
  try {
    const baseline = await check();
    if (baseline !== 0) {
      console.log(`Baseline red: exit ${baseline}`);
      process.exit(1);
    }
    console.log("Baseline green: exit 0");
  } finally {
    process.kill(-server.pid);
    process.kill(-chrome.pid);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
