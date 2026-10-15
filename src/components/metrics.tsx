"use client";

import { useEffect, useRef, useState } from "react";

export type Metric = {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  label: string;
};

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function Stat({ metric, on }: { metric: Metric; on: boolean }) {
  const [display, setDisplay] = useState(0);
  const reduce = useRef(false);

  useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (!on) return;
    if (reduce.current) {
      setDisplay(metric.value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const duration = 1400;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      setDisplay(metric.value * easeOutCubic(p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on, metric.value]);

  const text = display.toLocaleString("en-US", {
    minimumFractionDigits: metric.decimals ?? 0,
    maximumFractionDigits: metric.decimals ?? 0,
  });

  return (
    <div className="text-center">
      <p className="font-display text-4xl font-semibold tracking-tight text-paper tabular-nums lg:text-5xl">
        {metric.prefix}
        {text}
        {metric.suffix}
      </p>
      <p className="mt-3 font-mono text-xs uppercase tracking-[0.14em] text-muted">{metric.label}</p>
    </div>
  );
}

export default function Metrics({ items }: { items: Metric[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setOn(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
      {items.map((metric) => (
        <Stat key={metric.label} metric={metric} on={on} />
      ))}
    </div>
  );
}
