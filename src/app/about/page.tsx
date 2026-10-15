import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/reveal";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "How David Mwandairo works: raw data kept immutable, explicit grains, tested pipelines, and decisions written down.",
};

const principles = [
  {
    n: "01",
    title: "Raw data is sacred",
    body: "Bronze layers land bytes as they arrived: append-only, partitioned by ingestion date. When a downstream bug surfaces, we reprocess instead of re-fetching rate-limited APIs.",
  },
  {
    n: "02",
    title: "The grain decides",
    body: "Every model states its grain before it states its columns. Deduplicate with window functions against explicit business keys, and the warehouse stops arguing with itself.",
  },
  {
    n: "03",
    title: "Test the pipeline, not just the code",
    body: "Unit tests on ingestion, dbt tests on models, freshness and quality gates in front of consumers. A green build that never checked the data isn't green.",
  },
  {
    n: "04",
    title: "Write the decision down",
    body: "Trade-offs live in ADRs and READMEs: why bronze is immutable, why this join is point-in-time-correct, why logistic regression beat gradient boosting. Future readers deserve the reasoning, not just the result.",
  },
];

const toolbox = [
  { group: "Languages", items: ["Python", "SQL", "Bash"] },
  { group: "Warehouses & stores", items: ["PostgreSQL", "ClickHouse", "DuckDB"] },
  { group: "Modeling & quality", items: ["dbt", "SCD Type 2", "Great Expectations", "dbt tests"] },
  { group: "Orchestration & streaming", items: ["Airflow", "Kafka", "Debezium", "Docker Compose"] },
  { group: "ML & serving", items: ["scikit-learn", "FastAPI", "pytest"] },
  { group: "BI & observability", items: ["Power BI", "DAX", "Grafana", "Prometheus"] },
  { group: "Platform", items: ["Terraform", "Git", "GitHub"] },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-24 lg:py-32">
      <Reveal>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-faint">About</p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-paper sm:text-5xl">
          I like the unglamorous parts of data<span className="text-accent">.</span>
        </h1>
      </Reveal>

      <Reveal className="mt-10 space-y-5 text-lg leading-relaxed text-muted">
        <p>
          I&apos;m David Mwandairo, a data engineer and data scientist. The work I enjoy most sits between
          where data arrives and where decisions come out: the ingestion that survives a flaky API, the
          deduplication that makes the grain honest, the tests that catch the drift before the dashboard does.
        </p>
        <p>
          My portfolio reflects that. One project lands raw market JSON in an immutable bronze layer and walks
          it through dbt to point-in-time-correct marts. Another streams every OLTP change out of a microfinance
          core through Debezium and Kafka into ClickHouse, with Grafana watching each hop. A third takes a churn
          problem end to end: EDA, leakage-safe features, model selection, then a tested FastAPI service behind
          Docker.
        </p>
        <p>
          I care about the parts reviewers ask about: idempotency, auditability, latency you can measure, and
          numbers you can trace to a query.
        </p>
      </Reveal>

      <section className="mt-20">
        <Reveal>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-paper sm:text-3xl">
            How I work
          </h2>
        </Reveal>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {principles.map((principle, i) => (
            <Reveal key={principle.n} delay={i * 80}>
              <div className="card-hover h-full rounded-2xl border border-line bg-ink-3 p-6">
                <p className="font-mono text-sm text-accent">{principle.n}</p>
                <h3 className="mt-3 font-display text-lg font-semibold text-paper">{principle.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted">{principle.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mt-20">
        <Reveal>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-paper sm:text-3xl">Toolbox</h2>
        </Reveal>
        <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-7 sm:grid-cols-2">
          {toolbox.map((group, i) => (
            <Reveal key={group.group} delay={i * 50}>
              <h3 className="font-mono text-xs uppercase tracking-[0.14em] text-faint">{group.group}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <span key={item} className="chip">
                    {item}
                  </span>
                ))}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal className="mt-20 border-t border-line pt-10">
        <p className="text-muted">
          The best proof is the work itself:{" "}
          <Link href="/projects" className="link-slide text-accent">
            start with the case studies
          </Link>
          , or{" "}
          <a href={`mailto:${site.links.email}`} className="link-slide text-accent">
            email me
          </a>
          .
        </p>
      </Reveal>
    </div>
  );
}
