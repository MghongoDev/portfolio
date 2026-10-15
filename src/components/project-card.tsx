import Image from "next/image";
import Link from "next/link";
import type { ProjectMeta } from "@/lib/projects";

export default function ProjectCard({ project, wide = false }: { project: ProjectMeta; wide?: boolean }) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className={`group card-hover press relative flex flex-col overflow-hidden rounded-2xl border border-line bg-ink-3 ${
        wide ? "lg:col-span-2" : ""
      }`}
    >
      <div className={`relative overflow-hidden ${wide ? "aspect-[21/9] max-lg:aspect-[16/10]" : "aspect-[16/10]"}`}>
        {project.cover ? (
          <Image
            src={project.cover}
            alt={`${project.title} — ${project.tagline}`}
            fill
            sizes={wide ? "(min-width: 1024px) 1152px, 100vw" : "(min-width: 1024px) 576px, 100vw"}
            className="kenburns object-cover"
          />
        ) : (
          <div className="bg-grid flex h-full items-center justify-center">
            <span className="font-mono text-5xl text-line-strong" aria-hidden="true">
              {"{ }"}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-3 via-ink-3/10 to-transparent" aria-hidden="true" />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-6 lg:p-7">
        <div className="flex flex-wrap gap-2">
          {project.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="chip">
              {tag}
            </span>
          ))}
        </div>
        <h3 className="tcolor font-display text-xl font-semibold text-paper group-hover:text-accent lg:text-2xl">
          {project.title}
        </h3>
        <p className="text-sm leading-relaxed text-muted">{project.summary}</p>
        <span className="mt-auto inline-flex items-center gap-2 pt-3 text-sm text-accent">
          Read case study
          <span className="transition-transform duration-300 [transition-timing-function:var(--ease-snap)] group-hover:translate-x-1" aria-hidden="true">
            →
          </span>
        </span>
      </div>
    </Link>
  );
}
