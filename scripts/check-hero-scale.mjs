#!/usr/bin/env node
/**
 * Hero type-scale guard. Measures the real rendered hero at the design's
 * viewports through Chrome DevTools Protocol and fails if the name or tagline
 * clips, or if the name is no longer at editorial scale.
 *
 * This is the ticket #10 guard: the hero name must read at editorial scale on
 * every viewport without clipping, and the check must be provably non-vacuous.
 *
 * Usage:
 *   node scripts/check-hero-scale.mjs <baseUrl> [--cdp http://127.0.0.1:9229]
 *                                       [--widths 375,768,1024,1440,1920]
 *                                       [--variant 'clamp(4rem, 17.5vw, 12.75rem)']
 *
 * `--variant` measures the page with the hero name forced to a given CSS font
 * size instead of its shipped value. It is how the break-restore cycle forces
 * a clip without rebuilding, and how a reader reproduces any row of the ADR
 * table. With `--variant` in force the oversized control is skipped, since the
 * variant is already the deliberate break.
 * Requires a running Chrome with --remote-debugging-port and a served app.
 * It starts neither; it measures what is actually shipped.
 *
 * Exit codes:
 *   0  every viewport passes, and the oversized control was seen to clip
 *   1  a viewport clips, or the name is not at editorial scale
 *   2  the measurement itself was unusable (probe could not find the hero,
 *      no CDP browser, or the oversized control did NOT clip)
 *
 * Exit 2 is deliberate: a guard that cannot see a clip proves nothing, so a
 * control that fails to trip is a harness failure, not a pass.
 */

const VIEWPORTS = [375, 768, 1024, 1440, 1920];
// Below this fraction of the container the name no longer reads as editorial.
const MIN_FILL = 0.75;
// Above this fraction the name is about to clip.
const MAX_FILL = 1.0;

function parseArgs(argv) {
  const out = { base: null, cdp: "http://127.0.0.1:9229", widths: VIEWPORTS, variant: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--cdp") out.cdp = argv[++i];
    else if (a === "--widths") out.widths = argv[++i].split(",").map(Number);
    else if (a === "--variant") out.variant = argv[++i];
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
    console.error("usage: node scripts/check-hero-scale.mjs <baseUrl> [--cdp url] [--widths 375,768]");
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

  // Wait for the hero to exist AND to carry its real font size, rather than a
  // fixed sleep. A fixed sleep is flaky on a cold CI runner, where the first
  // render can take seconds; a poll is correct and no slower when it is fast.
  const waitForHero = async (timeoutMs) => {
    const deadline = Date.now() + timeoutMs;
    let last = null;
    while (Date.now() < deadline) {
      const r = await send("Runtime.evaluate", {
        expression:
          "(()=>{const h=document.querySelector('main h1');" +
          "if(!h) return null; const cs=getComputedStyle(h);" +
          "return cs.fontSize === '16px' ? null : cs.fontSize;})()",
        returnByValue: true,
      });
      last = r.result.value;
      if (last) return last;
      await new Promise((r) => setTimeout(r, 200));
    }
    return last;
  };

  // Wait until the injected font size has actually been applied, so a slow
  // first paint cannot be measured mid-transition.
  const waitForFontSize = async (_args, send, expected) => {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const r = await send("Runtime.evaluate", {
        expression:
          "(()=>{const h=document.querySelector('main h1');" +
          "if(!h) return null; return h.style.fontSize || null;})()",
        returnByValue: true,
      });
      if (r.result.value === expected) return true;
      await new Promise((r) => setTimeout(r, 150));
    }
    return false;
  };

  const measure = async (width, variant) => {
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

    // Freeze entry choreography so boxes are settled, not mid-animation.
    await send("Runtime.evaluate", {
      expression:
        "(()=>{const s=document.createElement('style');" +
        "s.textContent='*,*::before,*::after{animation:none!important;transition:none!important}';" +
        "document.head.appendChild(s);})()",
      returnByValue: true,
    });

    if (variant === "oversized") {
      await send("Runtime.evaluate", {
        expression:
          "(()=>{const h=document.querySelector('main h1');" +
          "if(h) h.style.fontSize='30vw'; return !!h;})()",
        returnByValue: true,
      });
      await waitForFontSize(args, send, "30vw");
    } else if (variant) {
      // An explicit scale, injected at measurement time. Lets the break-restore
      // cycle force a clip without rebuilding, and lets a reader reproduce any
      // row of the ADR table by name.
      await send("Runtime.evaluate", {
        expression:
          `(()=>{const h=document.querySelector('main h1');` +
          `if(h) h.style.fontSize=${JSON.stringify(variant)}; return !!h;})()`,
        returnByValue: true,
      });
      await waitForFontSize(args, send, variant);
    }

    const res = await send("Runtime.evaluate", {
      expression: MEASURE_JS,
      returnByValue: true,
    });

    await send("Emulation.clearDeviceMetricsOverride");
    return res.result.value;
  };

  const failures = [];
  const notes = [];
  let controlTripped = false;

  console.log(
    `hero scale guard: ${args.base} via ${args.cdp}` +
      (args.variant ? `  variant=${args.variant}` : ""),
  );
  for (const width of args.widths) {
    let m;
    try {
      m = await measure(width, args.variant ?? "current");
    } catch (err) {
      console.error(`FATAL: measurement failed at ${width}px: ${err.message}`);
      ws.close();
      return 2;
    }

    if (!m || !m.probe_ok) {
      console.error(`FATAL: probe could not find the hero at ${width}px (${JSON.stringify(m)})`);
      ws.close();
      return 2;
    }

    const fill = m.h1IntrinsicTextW / m.h1AvailableW;
    const line = `  ${String(width).padStart(5)}px  font=${m.h1Style.fontSize.padEnd(7)} ` +
      `fill=${(fill * 100).toFixed(0)}%  lines=${m.taglineGlyphs?.lineCount ?? "?"}  ` +
      `clip=${m.h1Clips || m.taglineClipsRight || m.taglineClipsLeft}`;
    console.log(line);

    if (m.h1Clips) failures.push(`${width}px: name clips its container`);
    if (m.taglineClipsRight || m.taglineClipsLeft) {
      failures.push(`${width}px: tagline clips its container`);
    }
    if (fill < MIN_FILL) {
      failures.push(`${width}px: name fills only ${(fill * 100).toFixed(0)}% of the container`);
    }
    if (fill > MAX_FILL) {
      failures.push(`${width}px: name overflows its container by ${((fill - 1) * 100).toFixed(0)}%`);
    }
    // The ticket asks for "no clipping" and "scannable", not a line budget.
    // The tagline is reported so a wrap change is visible in the output, but
    // its line count is a judgement, not a gate.

    // The control: force an oversized scale and require the guard to see it.
    // Skipped when --variant is in force, because the variant IS the deliberate
    // break and re-clipping on top of it would say nothing new.
    if (!args.variant) {
      let c;
      try {
        c = await measure(width, "oversized");
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
      if (c.h1Clips) controlTripped = true;
      else {
        notes.push(`${width}px: control did not clip (fill ${(c.h1IntrinsicTextW / c.h1AvailableW * 100).toFixed(0)}%)`);
      }
    }
  }

  ws.close();

  if (!args.variant && !controlTripped) {
    console.error("\nFATAL: the oversized control never clipped, so this guard cannot see a clip.");
    for (const n of notes) console.error(`  ${n}`);
    return 2;
  }

  if (failures.length) {
    console.error(`\nFAIL: ${failures.length} problem(s)`);
    for (const f of failures) console.error(`  - ${f}`);
    return 1;
  }

  console.log(
    "\nPASS: name and tagline read cleanly at every viewport" +
      (args.variant ? "." : "; control tripped as required."),
  );
  return 0;
}

const MEASURE_JS = String.raw`
(() => {
  const h1 = document.querySelector('main h1');
  const out = { probe_ok: false };
  if (!h1) { out.fatal = 'no h1'; return out; }

  const tagline = (() => {
    const c = h1.parentElement;
    if (!c) return null;
    return [...c.querySelectorAll('p')].find((p) =>
      p.textContent.trim().length > 40 && !p.querySelector('span.pulse-dot')) || null;
  })();

  const style = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { fontSize: cs.fontSize, lineHeight: cs.lineHeight, overflow: cs.overflow };
  };

  const box = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width),
             h: Math.round(b.height), right: Math.round(b.right) };
  };

  const glyphs = (el) => {
    if (!el) return null;
    const r = document.createRange();
    r.selectNodeContents(el);
    const rects = [...r.getClientRects()];
    if (!rects.length) return { lineCount: 0, maxLeft: null, maxRight: null };
    return { lineCount: rects.length,
             maxLeft: Math.min(...rects.map((x) => x.left)),
             maxRight: Math.max(...rects.map((x) => x.right)) };
  };

  const h1Style = style(h1);
  const tagG = glyphs(tagline);
  out.h1Style = h1Style;
  out.h1 = box(h1);
  out.tagline = box(tagline);
  out.taglineGlyphs = tagG;

  if (tagG) {
    out.taglineClipsRight = tagG.maxRight > out.tagline.right + 0.5;
    out.taglineClipsLeft = tagG.maxLeft < out.tagline.x - 0.5;
  }

  // Intrinsic text width vs the width the element is given. .mask-line keeps
  // overflow visible, so scrollWidth cannot detect this clip; the clone can.
  if (h1Style.overflow === 'visible') {
    const clone = h1.cloneNode(true);
    clone.style.cssText += ';position:absolute;left:-99999px;width:max-content;max-width:none;margin:0;';
    h1.parentElement.appendChild(clone);
    out.h1IntrinsicTextW = Math.round(clone.getBoundingClientRect().width);
    out.h1AvailableW = out.h1.w;
    out.h1Clips = out.h1IntrinsicTextW > out.h1AvailableW + 0.5;
    clone.remove();
  } else {
    out.h1IntrinsicTextW = null;
    out.h1AvailableW = out.h1.w;
    out.h1Clips = out.h1.scrollWidth > out.h1.clientWidth + 0.5;
  }

  out.probe_ok = true;
  return out;
})()
`;

process.exitCode = await main();
