import http from "http";

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

function parseColor(rgb) {
  const m = rgb.match(/(\d+(?:\.\d+)?)/g);
  if (!m || m.length < 3) return [0, 0, 0];
  return [Number(m[0]), Number(m[1]), Number(m[2])];
}

function luminance([r, g, b]) {
  const c = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function contrastRatio(rgb1, rgb2) {
  const l1 = luminance(parseColor(rgb1));
  const l2 = luminance(parseColor(rgb2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const BOXES_JS = `(() => {
const out = [];
const root = document.documentElement;
function box(el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: r.top,
    left: r.left,
    bottom: r.bottom,
    right: r.right,
    width: r.width,
    height: r.height
  };
}
const canvas = document.querySelector('canvas[aria-hidden="true"]');
const name = document.querySelector('h1 .mask-line');
const tag = document.querySelector('p.rise-blur');
const c = box(canvas);
const n = box(name);
const t = box(tag);
if (!c || !n || !t) return 'missing';
const overlap = Math.max(0, Math.min(c.bottom, n.bottom) - Math.max(c.top, n.top));
const canvasOverName = c.top < n.bottom && c.bottom > n.top && c.right > n.left && c.left < n.right;
const styles = root ? getComputedStyle(root) : { reducedMotion: '' };
return JSON.stringify({
  canvas: c,
  name: n,
  tag: t,
  overlap,
  canvasOverName,
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
});
})()`;

const MEASURE_JS = `(() => {
${BOXES_JS}
const data = JSON.parse(eval(${JSON.stringify(BOXES_JS)}));
return data;
})()`;

async function measure(url, cdp, forceAnimate, forceOverlap) {
  const wsUrl = cdp
    ? new URL(cdp).protocol.replace("http", "ws") + "/" +
      (await get(cdp.replace("http://", "") + "/json/list")).then((r) => {
        const pages = JSON.parse(r).filter((t) => t.type === "page");
        if (!pages.length) throw new Error("no page target");
        return pages[0].webSocketDebuggerUrl;
      })
    : null;

  // For CDP we need to fetch via the ws, but here we use a simpler approach:
  // We assume the page target is available via the standard /json/list endpoint
  // and we can use puppeteer-style connection. For simplicity, we use the
  // /json/list to get the ws and then use Runtime.evaluate.
  
  // Actually, for this script we use a simpler approach: connect via ws
  // but we need a WebSocket client. Use the node:ws module if available,
  // or fall back to an HTTP-based measurement.
  
  // Simplest: use the /json/version to confirm chrome is up, then
  // use Runtime.evaluate via the DevTools Protocol over WebSocket.
  
  // Since we might not have ws, we try to use the `ws` package.
  let WebSocket;
  try {
    WebSocket = (await import("ws")).default;
  } catch {
    // fallback: no ws, skip CDP
    if (cdp) throw new Error("ws package required for CDP");
    return null;
  }
  
  const listRes = await get(cdp.replace("http://", "") + "/json/list");
  const pages = JSON.parse(listRes).filter((t) => t.type === "page");
  if (!pages.length) throw new Error("no page target");
  const ws = new WebSocket(pages[0].webSocketDebuggerUrl);
  
  const id = (() => {
    let i = 1;
    return () => i++;
  })();
  
  const pending = new Map();
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const msg = { id: id(), method, params };
      pending.set(msg.id, { resolve, reject });
      ws.send(JSON.stringify(msg));
    });
  
  const msgs = [];
  ws.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
      pending.delete(msg.id);
    }
  });
  
  await new Promise((r) => ws.on("open", r));
  
  const { result: navigate } = await send("Page.navigate", { url });
  await new Promise((r) => setTimeout(r, 2000));
  
  // Wait for network idle
  await send("Page.setLifecycleEventsEnabled", { enabled: true });
  await new Promise((r) => {
    const handler = (msg) => {
      if (msg.method === "Page.lifecycleEvent" && msg.params.name === "networkIdle") {
        ws.off("message", handler);
        r();
      }
    };
    ws.on("message", handler);
    setTimeout(() => {
      ws.off("message", handler);
      r();
    }, 5000);
  });
  
  const { result: evalResult } = await send("Runtime.evaluate", {
    expression: MEASURE_JS,
    returnByValue: true,
    awaitPromise: true,
  });
  
  ws.close();
  
  if (!evalResult.result || !evalResult.result.value) {
    throw new Error("CDP evaluation returned empty result");
  }
  
  return JSON.parse(evalResult.result.value);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { url: null, cdp: null, forceAnimate: false, forceOverlap: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--cdp" && args[i + 1]) {
      out.cdp = args[++i];
    } else if (args[i] === "--force-animate") {
      out.forceAnimate = true;
    } else if (args[i] === "--force-overlap") {
      out.forceOverlap = true;
    } else {
      out.url = args[i];
    }
  }
  return out;
}

(async () => {
  const opts = parseArgs();
  if (!opts.url) {
    console.error("Usage: node scripts/check-hero-chart.mjs <url> [--cdp http://127.0.0.1:9222] [--force-animate] [--force-overlap]");
    process.exit(2);
  }
  const data = await measure(opts.url, opts.cdp, opts.forceAnimate, opts.forceOverlap);
  if (!data) {
    console.log("SKIP: no CDP and no direct measurement implemented");
    process.exit(0);
  }
  if (data === "missing") {
    console.error("FATAL: missing elements");
    process.exit(1);
  }
  const canvasBottom = data.canvas.bottom;
  const nameBottom = data.name.bottom;
  const tagBottom = data.tag.bottom;
  const overlap = data.overlap;
  const canvasOverName = data.canvasOverName;
  const maxViewportHeight = 844; // iPhone 12/13 Pro
  if (canvasBottom - nameBottom > maxViewportHeight * 0.05 && !opts.forceOverlap) {
    console.error(`FATAL: canvas bottom (${canvasBottom}px) exceeds name bottom (${nameBottom}px) by >5% at measured viewport`);
    process.exit(1);
  }
  if (canvasOverName && overlap > 0 && !opts.forceOverlap) {
    console.error(`FATAL: canvas overlaps name by ${overlap}px`);
    process.exit(1);
  }
  if (data.reducedMotion) {
    console.log("OK: reduced motion detected, static frame is acceptable");
    process.exit(0);
  }
  console.log("OK: chart guard passed");
  process.exit(0);
})().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
