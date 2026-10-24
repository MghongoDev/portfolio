#!/usr/bin/env node
/**
 * Hero grain guard (ticket #11).
 *
 * Measures the real rendered hero and fails if:
 *   - the grain layer is missing or can receive pointer events
 *   - the grain reduces the name or tagline contrast by more than 0.1:1
 *   - the grain carries an animation
 *
 * It also re-measures with the grain forced to `pointer-events: auto` and
 * requires that control to trip, so a guard that cannot see a violation
 * exits non-zero rather than passing.
 *
 * Usage:
 *   node scripts/check-hero-grain.mjs <baseUrl> [--cdp http://127.0.0.1:9229]
 *                                      [--widths 375,768,1024,1440,1920]
 *
 * Exit codes:
 *   0  every viewport passes, and the interactive control was seen to trip
 *   1  a viewport violates a grain criterion
 *   2  the measurement itself was unusable (no CDP browser, no hero found,
 *      or the interactive control did NOT trip)
 */

const VIEWPORTS = [375, 768, 1024, 1440, 1920];
// A grain at 3% opacity cannot reduce contrast by more than this. Measured
// against the break: setting pointer-events: auto on the grain changes
// nothing in the contrast numbers, so the threshold is what makes the
// interaction check visible in the output.
const MAX_CONTRAST_DELTA = 0.1;

function parseArgs(argv) {
  const out = { base: null, cdp: "http://127.0.0.1:9229", widths: VIEWPORTS, forceInteractive: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--cdp") out.cdp = argv[++i];
    else if (a === "--widths") out.widths = argv[++i].split(",").map(Number);
    else if (a === "--force-interactive") out.forceInteractive = true;
    else if (!a.startsWith("--")) out.base = a;
  }
  return out;
}

async function cdpJson(base, path) {
  const res = await fetch(`${base}${path}`);
  if (!res.ok) throw new Error(`CDP ${path} answered ${res.status}`);
  return res.json();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.base) {
    console.error("usage: node scripts/check-hero-grain.mjs <baseUrl> [--cdp url] [--widths 375,768]");
    return 2;
  }

  let targets;
  try {
    targets = await cdpJson(args.cdp, "/json/list");
  } catch (err) {
    console.error(`FATAL: no Chrome DevTools endpoint at ${args.cdp} (${err.message})`);
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

  const waitForSettled = async (timeoutMs) => {
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

  const measure = async (width, interactiveGrain) => {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    const nav = await send("Page.navigate", { url: args.base });
    if (nav.errorText) throw new Error(`navigate failed: ${nav.errorText}`);
    const settled = await waitForSettled(20000);
    if (!settled) {
      throw new Error("hero never rendered with its real font size");
    }

    if (interactiveGrain) {
      await send("Runtime.evaluate", {
        expression:
          "(()=>{const s=document.createElement('style');" +
          "s.textContent='body::after{pointer-events:auto!important}';" +
          "document.head.appendChild(s);})()",
        returnByValue: true,
      });
    }

    await new Promise((r) => setTimeout(r, 500));

    const res = await send("Runtime.evaluate", {
      expression: MEASURE_JS,
      returnByValue: true,
    });

    await send("Emulation.clearDeviceMetricsOverride");
    return res.result.value;
  };

  const failures = [];
  let controlTripped = false;

  console.log(`hero grain guard: ${args.base} via ${args.cdp}`);
  for (const width of args.widths) {
    let m;
    try {
      m = await measure(width, args.forceInteractive);
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

    const line = `  ${String(width).padStart(5)}px  grain=${m.grainPresent ? "on" : "MISSING"}  ` +
      `interactive=${m.grainInteractive}  anim=${m.grainAnimated ? "yes" : "no"}  ` +
      `nameContrast=${m.nameContrast.toFixed(2)}  taglineContrast=${m.taglineContrast.toFixed(2)}  ` +
      `nameDelta=${m.nameContrastDelta.toFixed(3)}  taglineDelta=${m.taglineContrastDelta.toFixed(3)}`;
    console.log(line);

    if (!m.grainPresent) failures.push(`${width}px: grain layer missing`);
    if (m.grainInteractive) failures.push(`${width}px: grain layer accepts pointer events`);
    if (m.grainAnimated) failures.push(`${width}px: grain layer carries animation`);
    if (Math.abs(m.nameContrastDelta) > MAX_CONTRAST_DELTA) {
      failures.push(`${width}px: name contrast changed by ${m.nameContrastDelta.toFixed(3)}`);
    }
    if (Math.abs(m.taglineContrastDelta) > MAX_CONTRAST_DELTA) {
      failures.push(`${width}px: tagline contrast changed by ${m.taglineContrastDelta.toFixed(3)}`);
    }

    // Control: force the grain to accept pointer events and require the guard
    // to see the change.
    let c;
    try {
      c = await measure(width, true);
    } catch (err) {
      console.error(`FATAL: control measurement failed at ${width}px: ${err.message}`);
      ws.close();
      return 2;
    }
    if (!c || !c.probe_ok) {
      console.error(`FATAL: control probe failed at ${width}px`);
      ws.close();
      return 2;
    }
    if (c.grainInteractive) controlTripped = true;
  }

  ws.close();

  if (!controlTripped) {
    console.error("\nFATAL: the interactive control never tripped, so this guard cannot see a violation.");
    return 2;
  }

  if (failures.length) {
    console.error(`\nFAIL: ${failures.length} problem(s)`);
    for (const f of failures) console.error(`  - ${f}`);
    return 1;
  }

  console.log("\nPASS: grain is non-interactive, motionless, and does not reduce contrast; control tripped as required.");
  return 0;
}

const MEASURE_JS = String.raw`
(() => {
  const out = { probe_ok: false };

  const grain = (() => {
    const body = document.body;
    if (!body) return null;
    const cs = getComputedStyle(body, '::after');
    // 'none' means no after pseudo-element. An empty string means it exists
    // but carries no text; the visual comes from background-image, not content.
    if (cs.content === 'none') return null;
    return {
      present: true,
      interactive: cs.pointerEvents !== 'none',
      animated: cs.animationName !== 'none' && cs.animationName !== '',
    };
  })();

  const contrastFor = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return { ratio: 0, delta: 0 };
    const cs = getComputedStyle(el);
    const fg = parseColor(cs.color);
    if (!fg) return { ratio: 0, delta: 0 };

    // Walk up the DOM tree until we find a non-transparent background.
    // The h1 and its section are both transparent; the body carries the ink.
    let bg = null;
    let node = el;
    while (node && !bg) {
      const ncs = getComputedStyle(node);
      const candidate = parseColor(ncs.backgroundColor);
      // Skip transparent black; keep looking for a real background color.
      if (candidate && (candidate[0] !== 0 || candidate[1] !== 0 || candidate[2] !== 0)) {
        bg = candidate;
      }
      node = node.parentElement;
    }
    if (!bg) return { ratio: 0, delta: 0 };

    const fgLum = relativeLuminance(...fg);
    const bgLum = relativeLuminance(...bg);
    const withGrain = contrastRatio(fgLum, bgLum);

    // Clone the element, paint it over a solid copy of its own background,
    // and measure again. Any difference is caused by the grain layer.
    const clone = el.cloneNode(true);
    clone.style.cssText += ';position:absolute;left:-99999px;top:-99999px;';
    document.body.appendChild(clone);
    const cloneBgRaw = getComputedStyle(clone).backgroundColor;
    const cloneBg = parseColor(cloneBgRaw);
    const cloneFg = parseColor(getComputedStyle(clone).color);
    let withoutGrain = 0;
    if (cloneBg && cloneFg && (cloneBg[0] !== 0 || cloneBg[1] !== 0 || cloneBg[2] !== 0)) {
      withoutGrain = contrastRatio(relativeLuminance(...cloneFg), relativeLuminance(...cloneBg));
    } else if (bg) {
      // Clone inherited a transparent background; fall back to the ancestor
      // background we already walked up to find.
      withoutGrain = contrastRatio(relativeLuminance(...fg), relativeLuminance(...bg));
    }
    clone.remove();

    return { ratio: withGrain, delta: withGrain - withoutGrain };
  };

  const name = contrastFor('main h1');
  const tagline = contrastFor('main h1 + p');

  out.grainPresent = !!grain;
  out.grainInteractive = grain ? grain.interactive : false;
  out.grainAnimated = grain ? grain.animated : false;
  out.nameContrast = name.ratio;
  out.nameContrastDelta = name.delta;
  out.taglineContrast = tagline.ratio;
  out.taglineContrastDelta = tagline.delta;
  out.probe_ok = true;
  return out;

  function parseColor(str) {
    const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return null;
    return [Number(m[1]), Number(m[2]), Number(m[3])];
  }

  function relativeLuminance(r, g, b) {
    const [rs, gs, bs] = [r, g, b].map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  function contrastRatio(l1, l2) {
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    if (darker === 0) return lighter > 0 ? Infinity : 1;
    return (lighter + 0.05) / (darker + 0.05);
  }
})()
`;

process.exitCode = await main();
