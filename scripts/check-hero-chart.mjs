#!/usr/bin/env node
/**
 * Hero chart guard (ticket #12, repaired by ticket #19).
 *
 * Measures the real rendered hero through the Chrome DevTools Protocol and fails
 * if the chart's drawn area overlaps the name.
 *
 * The guard this replaces could not reach Chrome at all. It stripped the protocol
 * off the CDP address before the HTTP call, so the first request died with
 * `Invalid URL`, and its WebSocket would next have come from a `ws` package that
 * is neither declared in package.json nor installed. It also never set a
 * viewport, so it measured whatever size the browser happened to be and
 * hardcoded an 844px phone height, and when CDP was unreachable it reported
 * success while measuring nothing, so the step could go green without looking.
 *
 * This guard uses the runtime's own WebSocket, walks the design's viewports, and
 * exits non-zero for every way the measurement can fail.
 *
 * Usage:
 *   node scripts/check-hero-chart.mjs <baseUrl> [--cdp http://127.0.0.1:9229]
 *                                        [--widths 375,768,1024,1440,1920]
 *
 * Exit codes:
 *   0  the chart does not overlap the name at any viewport
 *   1  the chart overlaps the name at some viewport
 *   2  the measurement itself was unusable: no CDP browser, no page target, the
 *      hero or the canvas never rendered, or the probe could not find them
 *
 * Requires a running Chrome with --remote-debugging-port and a served app. It
 * starts neither; it measures what is actually shipped.
 */

const VIEWPORTS = [375, 768, 1024, 1440, 1920];

function parseArgs(argv) {
  const out = { base: null, cdp: "http://127.0.0.1:9229", widths: VIEWPORTS };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--cdp") out.cdp = argv[++i];
    else if (a === "--widths") {
      // An empty or unusable list must not leave the guard with nothing to
      // measure: a run that measures zero viewports and reports a pass is a
      // silent skip, which is the defect this guard exists to avoid.
      const parsed = argv[++i]
        .split(",")
        .map(Number)
        .filter((n) => Number.isFinite(n) && n > 0);
      out.widths = parsed;
    } else if (!a.startsWith("--")) out.base = a;
  }
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function cdpJson(base, path) {
  const res = await fetch(`${base}${path}`);
  if (!res.ok) throw new Error(`CDP ${path} answered ${res.status}`);
  return res.json();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.base) {
    console.error("usage: node scripts/check-hero-chart.mjs <baseUrl> [--cdp url] [--widths 375,768]");
    return 2;
  }
  if (!args.widths.length) {
    console.error(
      "FATAL: --widths gave no usable viewport width; refusing to report a pass without measuring",
    );
    return 2;
  }

  let targets;
  try {
    targets = await cdpJson(args.cdp, "/json/list");
  } catch (err) {
    console.error(`FATAL: no Chrome DevTools endpoint at ${args.cdp} (${err.message})`);
    console.error("Start Chrome with --remote-debugging-port=9229, then re-run.");
    return 2;
  }

  const page = targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
  if (!page) {
    console.error(`FATAL: no page target at ${args.cdp}; found ${targets.length} target(s)`);
    return 2;
  }

  // The runtime's own WebSocket, the way the scale and grain guards connect. The
  // `ws` package this guard used to import is neither declared nor installed.
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", () => reject(new Error("websocket connect failed")), {
      once: true,
    });
  });

  let nextId = 0;
  const pending = new Map();
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(`${msg.error.message}`));
      else resolve(msg.result ?? {});
    }
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = (nextId += 1);
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });

  await send("Page.enable");
  await send("Runtime.enable");

  // Wait for the hero to exist. The font-size probe the siblings use is not a
  // reliable signal that the stylesheet has landed: an unstyled h1 computes to
  // the browser default rather than 16px, so that probe passes immediately and
  // the measurement can run against a canvas still at its 300x150 default.
  const waitForHero = async (timeoutMs) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const r = await send("Runtime.evaluate", {
        expression:
          "(()=>{const h=document.querySelector('main h1');" +
          "return h ? h.textContent.trim().length : null;})()",
        returnByValue: true,
      });
      if (r.result.value) return r.result.value;
      await sleep(200);
    }
    return null;
  };

  // The canvas carries the Tailwind `absolute` class, so its computed position
  // only reads absolute once the stylesheet has landed. That is the signal the
  // measurement needs: a canvas still at its default size is not the hero.
  const waitForCanvas = async (timeoutMs) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const r = await send("Runtime.evaluate", {
        expression:
          "(()=>{const c=document.querySelector('main canvas');" +
          "if(!c) return null; const cs=getComputedStyle(c);" +
          "const b=c.getBoundingClientRect();" +
          "return cs.position === 'absolute' && b.width > 0 && b.height > 0" +
          " ? [b.width,b.height] : null;})()",
        returnByValue: true,
      });
      if (r.result.value) return r.result.value;
      await sleep(200);
    }
    return null;
  };

  const measure = async (width) => {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    const nav = await send("Page.navigate", { url: args.base });
    if (nav.errorText) throw new Error(`navigate failed: ${nav.errorText}`);

    const settled = await waitForHero(20000);
    if (!settled) {
      throw new Error(
        `hero never rendered with its real font size at ${width}px (stayed at the 16px default)`,
      );
    }
    const canvas = await waitForCanvas(10000);
    if (!canvas) {
      throw new Error(`canvas never took its layout size at ${width}px`);
    }

    // Freeze entry choreography so boxes are settled, not mid-animation.
    await send("Runtime.evaluate", {
      expression:
        "(()=>{const s=document.createElement('style');" +
        "s.textContent='*,*::before,*::after{animation:none!important;transition:none!important}';" +
        "document.head.appendChild(s);})()",
      returnByValue: true,
    });

    const res = await send("Runtime.evaluate", {
      expression: MEASURE_JS,
      returnByValue: true,
    });

    await send("Emulation.clearDeviceMetricsOverride");
    return JSON.parse(res.result.value);
  };

  const failures = [];
  console.log(`hero chart guard: ${args.base} via ${args.cdp}`);

  for (const width of args.widths) {
    let m;
    try {
      m = await measure(width);
    } catch (err) {
      console.error(`FATAL: measurement failed at ${width}px: ${err.message}`);
      ws.close();
      return 2;
    }

    if (!m || !m.probe_ok) {
      console.error(`FATAL: probe could not find the canvas or the name at ${width}px`);
      ws.close();
      return 2;
    }

    console.log(
      `  ${String(width).padStart(5)}px  ` +
        `canvas=${m.canvas.x},${m.canvas.y} ${m.canvas.w}x${m.canvas.h}  ` +
        `name=${m.name.x},${m.name.y} ${m.name.w}x${m.name.h}  ` +
        `overlap=${m.overlap}`,
    );

    if (m.overlap) {
      failures.push(`${width}px: chart overlaps the name by ${m.overlapW}x${m.overlapH}px`);
    }
  }

  ws.close();

  if (failures.length) {
    console.error(`\nFAIL: ${failures.length} problem(s)`);
    for (const f of failures) console.error(`  - ${f}`);
    return 1;
  }

  console.log("\nPASS: the chart stays clear of the name at every viewport");
  return 0;
}

const MEASURE_JS = String.raw`
(() => {
  const out = { probe_ok: false };
  const canvas = document.querySelector('main canvas');
  const name = document.querySelector('main h1');
  if (!canvas || !name) return JSON.stringify(out);

  // left and top are captured alongside x and y: overlap logic that compares
  // right to left and bottom to top gives false positives when they are missing.
  const box = (el) => {
    const b = el.getBoundingClientRect();
    return {
      x: Math.round(b.x), y: Math.round(b.y),
      w: Math.round(b.width), h: Math.round(b.height),
      left: Math.round(b.left), top: Math.round(b.top),
      right: Math.round(b.right), bottom: Math.round(b.bottom),
    };
  };

  const c = box(canvas);
  const n = box(name);
  out.canvas = c;
  out.name = n;
  out.overlap = !(
    c.right <= n.left || c.left >= n.right || c.bottom <= n.top || c.top >= n.bottom
  );
  out.overlapW = Math.max(0, Math.min(c.right, n.right) - Math.max(c.left, n.left));
  out.overlapH = Math.max(0, Math.min(c.bottom, n.bottom) - Math.max(c.top, n.top));
  out.probe_ok = true;
  return JSON.stringify(out);
})()
`;

process.exitCode = await main();
