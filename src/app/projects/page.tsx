import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/reveal";
import { getFeaturedProjects } from "@/lib/projects";
import { craftProject, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Case studies in data engineering, analytics engineering, and machine learning: pipelines, models, and dashboards with their real numbers.",
};

export default function ProjectsPage() {
  const featured = getFeaturedProjects();
  const rows = [
    ...featured.map((p) => ({
      slug: p.slug,
      title: p.title,
      summary: p.summary,
      tags: p.tags,
      year: p.date.slice(0, 4),
      href: `/projects/${p.slug}`,
      external: false,
      badge: null as string | null,
    })),
    {
      slug: craftProject.slug,
      title: craftProject.title,
      summary: craftProject.summary,
      tags: craftProject.tags,
      year: craftProject.year,
      href: craftProject.repo,
      external: true,
      badge: "Engineering craft",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-24 lg:py-32">
      <Reveal>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-faint">Index</p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-paper sm:text-5xl">
          All projects<span className="text-accent">.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          Four case studies plus one craft build. Every number you&apos;ll see is real and traceable to a repo.
        </p>
      </Reveal>

      <div className="mt-14 border-t border-line">
        {rows.map((row, i) => (
          <Reveal key={row.slug} delay={i * 60}>
            <Link
              href={row.href}
              {...(row.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="group press grid grid-cols-[2.5rem_1fr_auto] items-start gap-4 border-b border-line px-2 py-8 transition-colors [transition-timing-function:var(--ease-snap)] hover:bg-ink-2/70 sm:gap-8 sm:px-4"
            >
              <span className="pt-1 font-mono text-sm text-faint">{String(i + 1).padStart(2, "0")}</span>
              <span>
                <span className="flex flex-wrap items-center gap-3">
                  <span className="tcolor font-display text-xl font-semibold text-paper group-hover:text-accent sm:text-2xl">
                    {row.title}
                  </span>
                  {row.badge && <span className="chip !border-accent/30 !text-accent">{row.badge}</span>}
                </span>
                <span className="mt-2 block max-w-2xl text-sm leading-relaxed text-muted">{row.summary}</span>
                <span className="mt-4 flex flex-wrap gap-2">
                  {row.tags.slice(0, 5).map((tag) => (
                    <span key={tag} className="chip">
                      {tag}
                    </span>
                  ))}
                </span>
              </span>
              <span className="flex items-center gap-4 pt-1 font-mono text-sm text-faint">
                {row.year}
                <span
                  className="tcolor inline-block text-accent transition-transform duration-300 [transition-timing-function:var(--ease-snap)] group-hover:translate-x-1"
                  aria-hidden="true"
                >
                  {row.external ? "↗" : "→"}
                </span>
              </span>
            </Link>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-10">
        <p className="text-sm text-muted">
          More experiments and practice repos live on{" "}
          <a href={site.links.github} target="_blank" rel="noopener noreferrer" className="link-slide text-accent">
            GitHub
          </a>
          .
        </p>
      </Reveal>
    </div>
  );
}
