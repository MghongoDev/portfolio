import Capabilities from "@/components/capabilities";
import Cta from "@/components/cta";
import Hero from "@/components/hero";
import Metrics from "@/components/metrics";
import ProjectCard from "@/components/project-card";
import Reveal from "@/components/reveal";
import Ticker from "@/components/ticker";
import { getFeaturedProjects } from "@/lib/projects";

export default function Home() {
  const featured = getFeaturedProjects();

  return (
    <>
      <Hero />
      <Ticker />

      <section className="mx-auto max-w-6xl px-6 py-24 lg:py-32">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-faint">Featured work</p>
          <h2 className="mt-4 max-w-2xl font-display text-3xl font-semibold tracking-tight text-paper sm:text-4xl">
            Systems that shipped.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-muted">
            Four builds, told honestly: what broke, what I decided, and what it produced.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {featured.map((project, i) => (
            <Reveal key={project.slug} delay={i === 0 ? 0 : 80} className={i === 0 ? "lg:col-span-2" : ""}>
              <ProjectCard project={project} wide={i === 0} />
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-ink-2/40">
        <Reveal className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
          <Metrics
            items={[
              { value: 4, label: "flagship builds" },
              { value: 7021, label: "customers scored" },
              { value: 0.84, decimals: 2, label: "ROC-AUC, churn task" },
              { value: 25, label: "DAX measures shipped" },
            ]}
          />
        </Reveal>
      </section>

      <Capabilities />
      <Cta />
    </>
  );
}
