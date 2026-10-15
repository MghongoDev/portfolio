import Link from "next/link";
import Reveal from "@/components/reveal";
import { site } from "@/lib/site";

export default function Cta() {
  return (
    <section className="border-t border-line bg-ink-2/40">
      <Reveal className="mx-auto max-w-6xl px-6 py-20 text-center lg:py-28">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-faint">Next step</p>
        <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-semibold tracking-tight text-paper sm:text-5xl">
          Have data that misbehaves?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
          I&apos;m open to data engineering and science roles. Email reaches me fastest.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <a href={`mailto:${site.links.email}`} className="btn btn-primary press">
            Email me
            <span aria-hidden="true">↗</span>
          </a>
          <Link href="/contact" className="btn btn-ghost press">
            All contact links
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
