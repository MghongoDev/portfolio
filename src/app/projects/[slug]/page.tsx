import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Reveal from "@/components/reveal";
import { getAllProjectSlugs, getFeaturedProjects, getProjectHtml, getProjectMeta } from "@/lib/projects";

export function generateStaticParams() {
  return getAllProjectSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  try {
    const meta = getProjectMeta(slug);
    return { title: meta.title, description: meta.summary };
  } catch {
    return {};
  }
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDate(date: string) {
  const [year, month] = date.split("-");
  const m = Number(month);
  return m >= 1 && m <= 12 ? `${months[m - 1]} ${year}` : date;
}

export default async function ProjectPage(props: PageProps<"/projects/[slug]">) {
  const { slug } = await props.params;

  let meta;
  try {
    meta = getProjectMeta(slug);
  } catch {
    notFound();
  }

  const html = await getProjectHtml(slug);
  const featured = getFeaturedProjects();
  const idx = featured.findIndex((p) => p.slug === slug);
  const prev = idx > 0 ? featured[idx - 1] : featured[featured.length - 1];
  const next = idx >= 0 && idx < featured.length - 1 ? featured[idx + 1] : featured[0];

  return (
    <article>
      <header className="border-b border-line bg-ink-2/40">
        <div className="mx-auto max-w-4xl px-6 pb-14 pt-16 lg:pt-20">
          <Reveal>
            <Link href="/projects" className="link-slide text-sm text-muted tcolor hover:text-paper">
              ← All projects
            </Link>
            <div className="mt-8 flex flex-wrap gap-2">
              {meta.tags.map((tag) => (
                <span key={tag} className="chip">
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="mt-5 font-display text-4xl font-bold tracking-tight text-paper sm:text-5xl">
              {meta.title}
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-muted sm:text-xl">{meta.tagline}</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <span className="font-mono text-xs uppercase tracking-[0.14em] text-faint">
                {formatDate(meta.date)}
              </span>
              {meta.repo && (
                <a href={meta.repo} target="_blank" rel="noopener noreferrer" className="btn btn-ghost press !px-4 !py-2 text-xs">
                  Source repo <span aria-hidden="true">↗</span>
                </a>
              )}
              {meta.demo && (
                <a href={meta.demo} target="_blank" rel="noopener noreferrer" className="btn btn-primary press !px-4 !py-2 text-xs">
                  Live demo <span aria-hidden="true">↗</span>
                </a>
              )}
            </div>
          </Reveal>
        </div>
      </header>

      {meta.cover && (
        <Reveal className="mx-auto max-w-4xl px-6 pt-10">
          <div className="relative aspect-[21/9] overflow-hidden rounded-2xl border border-line">
            <Image
              src={meta.cover}
              alt={`${meta.title} cover visual`}
              fill
              sizes="(min-width: 896px) 896px, 100vw"
              className="object-cover"
              priority
            />
          </div>
        </Reveal>
      )}

      <Reveal className="mx-auto max-w-3xl px-6 py-14 lg:py-20">
        <div className="prose-case" dangerouslySetInnerHTML={{ __html: html }} />
      </Reveal>

      <nav className="border-t border-line" aria-label="More case studies">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-px sm:grid-cols-2">
          <Link
            href={`/projects/${prev.slug}`}
            className="group px-6 py-10 transition-colors [transition-timing-function:var(--ease-snap)] hover:bg-ink-2/60"
          >
            <span className="font-mono text-xs uppercase tracking-[0.14em] text-faint">← Previous</span>
            <span className="tcolor mt-2 block font-display text-lg font-semibold text-paper group-hover:text-accent">
              {prev.title}
            </span>
          </Link>
          <Link
            href={`/projects/${next.slug}`}
            className="group px-6 py-10 text-right transition-colors [transition-timing-function:var(--ease-snap)] hover:bg-ink-2/60"
          >
            <span className="font-mono text-xs uppercase tracking-[0.14em] text-faint">Next →</span>
            <span className="tcolor mt-2 block font-display text-lg font-semibold text-paper group-hover:text-accent">
              {next.title}
            </span>
          </Link>
        </div>
      </nav>
    </article>
  );
}
