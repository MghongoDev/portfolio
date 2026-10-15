import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import Reveal from "@/components/reveal";

export const metadata: Metadata = {
  title: "Experience",
  description: "David Mwandairo's experience timeline: independent data platform builds across engineering, modeling, and BI.",
};

type Entry = {
  period: string;
  role: string;
  org: string;
  summary: string;
  tags: string[];
};

function readEntries(): { note: string; entries: Entry[] } {
  const file = path.join(process.cwd(), "content", "experience.json");
  const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as { note: string; entries: Entry[] };
  if (!Array.isArray(parsed.entries) || parsed.entries.length === 0) {
    throw new Error("content/experience.json must define a non-empty entries array");
  }
  for (const entry of parsed.entries) {
    for (const key of ["period", "role", "org", "summary"] as const) {
      if (typeof entry[key] !== "string" || entry[key].length === 0) {
        throw new Error(`Experience entry missing required field "${key}"`);
      }
    }
  }
  return parsed;
}

export default function ExperiencePage() {
  const { note, entries } = readEntries();

  return (
    <div className="mx-auto max-w-4xl px-6 py-24 lg:py-32">
      <Reveal>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-faint">Experience</p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-paper sm:text-5xl">
          The story so far<span className="text-accent">.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          Roles and platforms I&apos;ve built, newest first. The{" "}
          <Link href="/projects" className="link-slide text-accent">
            case studies
          </Link>{" "}
          are the evidence behind each line.
        </p>
      </Reveal>

      <div className="relative mt-14 space-y-14 border-l border-line pl-8 lg:pl-12">
        {entries.map((entry, i) => (
          <Reveal key={`${entry.period}-${entry.role}`} delay={i * 80}>
            <div className="relative">
              <span
                className="absolute -left-[41px] top-1.5 h-2.5 w-2.5 rounded-full border border-accent bg-ink lg:-left-[57px]"
                aria-hidden="true"
              />
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">{entry.period}</p>
              <h2 className="mt-2 font-display text-xl font-semibold text-paper sm:text-2xl">{entry.role}</h2>
              <p className="mt-1 text-sm text-muted">{entry.org}</p>
              <p className="mt-3 max-w-2xl leading-relaxed text-muted">{entry.summary}</p>
              {entry.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {entry.tags.map((tag) => (
                    <span key={tag} className="chip">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-14 border-t border-line pt-6">
        <p className="font-mono text-xs leading-relaxed text-faint">{note}</p>
      </Reveal>
    </div>
  );
}
