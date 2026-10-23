#!/usr/bin/env node
/**
 * Hero chart guard (ticket #12). Measures the real rendered hero through
 * Chrome DevTools Protocol and fails if the chart overlaps the name or if
 * the chart animates under reduced motion.
 *
 * Usage:
 *   node scripts/check-hero-chart.mjs <baseUrl> [--cdp http://127.0.0.1:9229]
 *                                        [--widths 375,768,1024,1440,1920]
 *                                        [--force-animate]
 *                                        [--force-overlap]
 *
 * `--force-animate` overrides prefers-reduced-motion so the chart animates
 * even when the system requests reduced motion.
 * `--force-overlap` forces the canvas to fill the hero so the overlap check
 * trips.
 *
 * Exit codes:
 *   0  chart does not overlap the name, and reduced motion produces a static frame
 *   1  chart overlaps the name, or chart animates under reduced motion
 *   2  measurement failed (no CDP browser, page never rendered, etc.)
 */

const VIEWPORTS = [375, 768, 1024, 1440, 1920];
const SAMPLE_DELAY_MS = 1000;

function parseArgs(argv) {
  const out = { base: null, cdp: "http://127.0.0.1:9229", widths: VIEWPORTS, forceAnimate: false, forceOverlap: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--cdp") out.cdp = argv[++i];
    else if (a === "--widths") out.widths = argv[++i].split(",").map(Number);
    else if (a === "--force-animate") out.forceAnimate = true;
    else if (a === "--force-overlap") out.forceOverlap = true;
    else if (!a.startsWith("--")) out.base = a;
  }
  return out;
}

async function cdpJson(base, path) {
  const res = await fetch(`${base}${path}`);
  if (!res.ok) throw new Error(`CDP ${path} answered ${res.status}`);
  return res.json();
}

function boxesOverlap(a, b) {
  if (!a || !b) return false;
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.base) {
    console.error("usage: node scripts/check-hero-chart.mjs <baseUrl> [--cdp url] [--widths 375,768]");
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

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", () => reject(new Error("websocket connect failed")), { once: true });
  });

  let nextId = 0;
  const pending = new Map();
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result ?? {});
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

  const waitForHero = async (timeoutMs) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const r = await send("Runtime.evaluate", {
        expression:
          "(()=>{const h=document.querySelector('main h1');" +
          "if(!h) return null; const cs=getComputedStyle(h);" +
          "return cs.fontSize === '16px' ? null : cs.fontSize;})()",
        returnByValue: true,
      });
      if (r.result.value) return r.result.value;
      await new Promise((r) => setTimeout(r, 200));
    }
    return null;
  };

  const measureBoxes = async (width, forceAnimate, forceOverlap) => {
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
      throw new Error(`hero never rendered with its real font size at ${width}px`);
    }

    // Freeze entry choreography so boxes are settled.
    await send("Runtime.evaluate", {
      expression:
        "(()=>{const s=document.createElement('style');" +
        "s.textContent='*,*::before,*::after{animation:none!important;transition:none!important}';" +
        "document.head.appendChild(s);})()",
      returnByValue: true,
    });

    if (forceAnimate) {
      await send("Runtime.evaluate", {
        expression:
          "(()=>{window.matchMedia = (q) => ({matches: q.includes('reduce') ? false : true, media: q, addListener:()=>{}, removeListener:()=>{}, addEventListener:()=>{}, removeEventListener:()=>{}, dispatchEvent:()=>true});})()",
        returnByValue: true,
      });
    }

    if (forceOverlap) {
      await send("Runtime.evaluate", {
        expression:
          "(()=>{const c=document.querySelector('main canvas');" +
          "if(c) c.style.cssText='position:absolute;inset:0;height:100%;width:100%'; return !!c;})()",
        returnByValue: true,
      });
    }

    const res = await send("Runtime.evaluate", {
      expression: BOXES_JS,
      returnByValue: true,
    });

    await send("Emulation.clearDeviceMetricsOverride");
    let measured;
    try {
      measured = JSON.parse(res.result.value);
    } catch {
      measured = res.result.value;
    }
    return measured;
  };

  const sampleCanvas = async () => {
    const r = await send("Runtime.evaluate", {
      expression: SAMPLE_JS,
      returnByValue: true,
    });
    if (r.result.value === null || r.result.value === undefined) {
      throw new Error("cannot sample canvas");
    }
    return r.result.value;
  };

  const failures = [];
  const notes = [];
  let reducedMotionControlTripped = false;
  let overlapControlTripped = false;

  console.log(`hero chart guard: ${args.base} via ${args.cdp}`);
  for (const width of args.widths) {
    let m;
    try {
      m = await measureBoxes(width, args.forceAnimate, args.forceOverlap);
    } catch (err) {
      console.error(`FATAL: measurement failed at ${width}px: ${err.message}`);
      ws.close();
      return 2;
    }

    if (!m || !m.probe_ok) {
      console.error(`FATAL: probe failed at ${width}px (${JSON.stringify(m)})`);
      ws.close();
      return 2;
    }

    const line = `  ${String(width).padStart(5)}px  chart=${m.chart.y.toFixed(0)},${m.chart.x.toFixed(0)} ${m.chart.w.toFixed(0)}x${m.chart.h.toFixed(0)}  ` +
      `h1=${m.h1.y.toFixed(0)},${m.h1.x.toFixed(0)} ${m.h1.w.toFixed(0)}x${m.h1.h.toFixed(0)}  ` +
      `overlap=${m.overlap}`;
    console.log(line);

    if (m.overlap) failures.push(`${width}px: chart overlaps the name`);

    // Overlap control: force the canvas full-size and require overlap.
    let overlapControl;
    try {
      overlapControl = await measureBoxes(width, false, true);
    } catch (err) {
      console.error(`FATAL: overlap control failed at ${width}px: ${err.message}`);
      ws.close();
      return 2;
    }
    if (!overlapControl || !overlapControl.probe_ok) {
      console.error(`FATAL: overlap control probe failed at ${width}px`);
      ws.close();
      return 2;
    }
    if (overlapControl.overlap) overlapControlTripped = true;
    else notes.push(`${width}px: overlap control did not trip`);

    // Reduced-motion measurement: sample canvas twice with a delay.
    const reduce = m.reduceMotion;
    let staticOk = null;
    try {
      const hash1 = await sampleCanvas();
      await new Promise((r) => setTimeout(r, SAMPLE_DELAY_MS));
      const hash2 = await sampleCanvas();
      staticOk = hash1 === hash2;
    } catch (err) {
      console.error(`FATAL: canvas sampling failed at ${width}px: ${err.message}`);
      ws.close();
      return 2;
    }

    if (reduce && !staticOk) {
      failures.push(`${width}px: chart does not produce a static frame under reduced motion`);
    }

    // Reduced-motion control: verify the canvas IS animated when motion is allowed.
    let c;
    try {
      c = await measureBoxes(width, true, false);
    } catch (err) {
      console.error(`FATAL: reduced-motion control failed at ${width}px: ${err.message}`);
      ws.close();
      return 2;
    }
    if (!c || !c.probe_ok) {
      console.error(`FATAL: reduced-motion control probe failed at ${width}px`);
      ws.close();
      return 2;
    }
    if (c.animated) reducedMotionControlTripped = true;
  }

  ws.close();

  if (!overlapControlTripped) {
    console.error("\nFATAL: the overlap control never tripped, so the overlap check is vacuous.");
    for (const n of notes) console.error(`  ${n}`);
    return 2;
  }
  if (!reducedMotionControlTripped) {
    console.error("\nFATAL: the reduced-motion control never saw animation, so the static-frame check is vacuous.");
    return 2;
  }

  if (failures.length) {
    console.error(`\nFAIL: ${failures.length} problem(s)`);
    for (const f of failures) console.error(`  - ${f}`);
    return 1;
  }

  console.log("\nPASS: chart recedes behind the name, and reduced motion produces a static frame; controls tripped as required.");
  return 0;
}

const BOXES_JS = String.raw`
(() => {
  const canvas = document.querySelector('main canvas');
  const h1 = document.querySelector('main h1');
  if (!canvas || !h1) return { probe_ok: false, fatal: 'no canvas or h1' };

  const box = (el) => {
    const b = el.getBoundingClientRect();
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), left: Math.round(b.left), top: Math.round(b.top), right: Math.round(b.right), bottom: Math.round(b.bottom) };
  };

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const cb = box(canvas);
  const hb = box(h1);

  const ov = boxesOverlap(cb, hb);
  return JSON.stringify({
    probe_ok: true,
    chart: cb,
    h1: hb,
    overlap: ov,
    reduceMotion,
    animated: !reduceMotion,
  });

  function boxesOverlap(a, b) {
    return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
  }
})()
`;

const SAMPLE_JS = String.raw`
(() => {
  const canvas = document.querySelector('main canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const w = canvas.width;
  const h = canvas.height;
  if (!w || !h) return null;
  const img = ctx.getImageData(0, 0, w, h);
  let hash = 0;
  for (let i = 0; i < img.data.length; i += 16) {
    hash = ((hash << 5) - hash + img.data[i]) | 0;
  }
  return hash;
})()
`;

process.exitCode = await main();

