"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { site } from "@/lib/site";

/* Deterministic PRNG so the chart shape is stable across renders */
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

type Particle = { x: number; y: number; r: number; vy: number; tw: number; ts: number };

function ChartCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const N = 150;
    const rand = mulberry32(20261013);

    const pts: number[] = [];
    let v = 0.5;
    for (let i = 0; i < N; i++) {
      v += (rand() - 0.48) * 0.09;
      v = Math.min(0.92, Math.max(0.08, v));
      pts.push(v);
    }

    const particles: Particle[] = Array.from({ length: 24 }, () => ({
      x: rand(),
      y: rand(),
      r: 0.8 + rand() * 1.4,
      vy: 0.00008 + rand() * 0.00022,
      tw: rand() * Math.PI * 2,
      ts: 0.5 + rand() * 1.2,
    }));

    let w = 0;
    let h = 0;
    let raf = 0;
    const t0 = performance.now();
    const pointer = { x: -1, y: 0, active: false };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const dip = (x: number) => {
      if (!pointer.active) return 0;
      const sigma = w * 0.06;
      const g = Math.exp(-((x - pointer.x) ** 2) / (2 * sigma * sigma));
      return -16 * g;
    };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, w, h);

      const progress = reduce ? 1 : easeOutCubic(Math.min(1, (now - t0) / 1500));
      const count = Math.max(2, Math.floor(N * progress));
      const margin = 8;
      const baseY = h * 0.74;
      const amp = h * 0.34;

      // area fill under the line
      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        const x = margin + (i / (N - 1)) * (w - margin * 2);
        const y = baseY - pts[i] * amp + dip(x);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      const linePath = new Path2D();
      for (let i = 0; i < count; i++) {
        const x = margin + (i / (N - 1)) * (w - margin * 2);
        const y = baseY - pts[i] * amp + dip(x);
        if (i === 0) linePath.moveTo(x, y);
        else linePath.lineTo(x, y);
      }
      const fillPath = new Path2D(linePath);
      fillPath.lineTo(margin + ((count - 1) / (N - 1)) * (w - margin * 2), h);
      fillPath.lineTo(margin, h);
      fillPath.closePath();
      const grad = ctx.createLinearGradient(0, baseY - amp, 0, h);
      grad.addColorStop(0, "rgba(200,240,75,0.10)");
      grad.addColorStop(1, "rgba(200,240,75,0)");
      ctx.fillStyle = grad;
      ctx.fill(fillPath);

      // faint data ticks under sampled points
      ctx.strokeStyle = "rgba(233,241,238,0.14)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < count; i += 15) {
        const x = margin + (i / (N - 1)) * (w - margin * 2);
        const y = baseY - pts[i] * amp + dip(x);
        ctx.moveTo(x, y + 8);
        ctx.lineTo(x, y + 16);
      }
      ctx.stroke();

      // glow pass
      ctx.strokeStyle = "rgba(200,240,75,0.16)";
      ctx.lineWidth = 6;
      ctx.stroke(linePath);

      // main line
      ctx.strokeStyle = "rgba(200,240,75,0.95)";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "rgba(200,240,75,0.5)";
      ctx.shadowBlur = 10;
      ctx.stroke(linePath);
      ctx.shadowBlur = 0;

      // travelling scan dot
      if (progress >= 1) {
        const p = reduce ? 0.62 : (now * 0.00005) % 1;
        const fi = p * (N - 1);
        const i0 = Math.floor(fi);
        const i1 = Math.min(N - 1, i0 + 1);
        const frac = fi - i0;
        const x = margin + (fi / (N - 1)) * (w - margin * 2);
        const y = baseY - (pts[i0] * (1 - frac) + pts[i1] * frac) * amp + dip(x);
        ctx.beginPath();
        ctx.arc(x, y, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(200,240,75,1)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(200,240,75,0.3)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // particles
      for (const pt of particles) {
        if (!reduce) {
          pt.y -= pt.vy * 16;
          if (pt.y < -0.01) pt.y = 1.01;
        }
        const alpha = 0.18 + 0.25 * (0.5 + 0.5 * Math.sin(now * 0.001 * pt.ts + pt.tw));
        ctx.beginPath();
        ctx.arc(pt.x * w, pt.y * h, pt.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(233,241,238,${alpha.toFixed(3)})`;
        ctx.fill();
      }
    };

    const loop = (now: number) => {
      draw(now);
      raf = requestAnimationFrame(loop);
    };

    resize();
    if (reduce) {
      draw(performance.now());
      return () => {};
    }
    raf = requestAnimationFrame(loop);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    };
    const onLeave = () => {
      pointer.active = false;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="bg-grid mask-radial-top absolute inset-0" aria-hidden="true" />
      <div
        className="absolute -top-32 right-[-10%] h-[420px] w-[420px] rounded-full opacity-60"
        style={{ background: "radial-gradient(circle, rgba(200,240,75,0.09) 0%, transparent 65%)" }}
        aria-hidden="true"
      />
      <div
        className="absolute bottom-[-20%] left-[-10%] h-[480px] w-[480px] rounded-full opacity-50"
        style={{ background: "radial-gradient(circle, rgba(120,200,180,0.07) 0%, transparent 65%)" }}
        aria-hidden="true"
      />
      <ChartCanvas />

      <div className="relative mx-auto flex min-h-[88vh] max-w-6xl flex-col justify-center px-6 pb-24 pt-28 lg:min-h-[92vh] lg:pt-32">
        <p
          className="rise font-mono text-xs uppercase tracking-[0.22em] text-muted"
          style={{ animationDelay: "80ms" }}
        >
          {site.role}
        </p>

        <h1 className="mt-6 font-display text-[clamp(2.9rem,8.5vw,5.75rem)] font-bold leading-[0.98] tracking-tight text-paper">
          <span className="mask-line">
            <span style={{ animationDelay: "160ms" }}>David</span>
          </span>
          <span className="mask-line">
            <span style={{ animationDelay: "280ms" }}>
              Mwandairo<span className="text-accent">.</span>
            </span>
          </span>
        </h1>

        <p
          className="rise-blur mt-7 max-w-xl text-lg leading-relaxed text-muted"
          style={{ animationDelay: "460ms" }}
        >
          {site.tagline}
        </p>

        <div className="rise mt-9 flex flex-wrap items-center gap-4" style={{ animationDelay: "580ms" }}>
          <Link href="/projects" className="btn btn-primary press">
            View case studies
            <span aria-hidden="true">→</span>
          </Link>
          <Link href="/resume" className="btn btn-ghost press">
            Résumé
          </Link>
        </div>

        <p
          className="rise mt-8 inline-flex w-fit items-center gap-2.5 rounded-full border border-line px-4 py-2 font-mono text-xs text-muted"
          style={{ animationDelay: "680ms" }}
        >
          <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          Open to data engineering &amp; science roles
        </p>
      </div>

      <div
        className="scroll-cue absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.3em] text-faint"
        aria-hidden="true"
      >
        scroll
      </div>
    </section>
  );
}
