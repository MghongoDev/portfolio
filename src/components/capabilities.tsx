import Link from "next/link";
import Reveal from "@/components/reveal";
import { site } from "@/lib/site";

const capabilities = [
  {
    n: "01",
    title: "Data Engineering",
    body: "Batch and streaming pipelines that treat raw data as an audit trail — Airflow-orchestrated ingestion, CDC with Debezium and Kafka, idempotent loads, and quality gates before anything reaches a consumer.",
    stack: ["Airflow", "Kafka", "Debezium", "Docker", "Terraform"],
  },
  {
    n: "02",
    title: "Analytics Engineering",
    body: "Warehouse modeling with dbt: staging → intermediate → marts, slowly-changing dimensions done properly, point-in-time-correct joins, and tests that make the grain explicit.",
    stack: ["dbt", "PostgreSQL", "ClickHouse", "DuckDB", "Great Expectations"],
  },
  {
    n: "03",
    title: "Machine Learning & Data Science",
    body: "Leakage-safe scikit-learn pipelines, honest model selection (F1 over accuracy on imbalanced data), and serving through documented FastAPI services with tests and containers.",
    stack: ["scikit-learn", "FastAPI", "pytest", "Docker"],
  },
  {
    n: "04",
    title: "Dashboards & Storytelling",
    body: "SQL that answers the actual business question, then Power BI and Grafana surfaces where every headline number ties back to a query someone can read.",
    stack: ["SQL", "Power BI", "DAX", "Grafana", "Prometheus"],
  },
];

export default function Capabilities() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24 lg:py-32">
      <Reveal>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-faint">What I do</p>
        <h2 className="mt-4 max-w-2xl font-display text-3xl font-semibold tracking-tight text-paper sm:text-4xl">
          Four disciplines, one pipeline.
        </h2>
      </Reveal>

      <div className="mt-14 border-t border-line">
        {capabilities.map((cap, i) => (
          <Reveal key={cap.n} delay={i * 80}>
            <div className="group grid grid-cols-[auto_1fr] gap-6 border-b border-line py-9 transition-colors [transition-timing-function:var(--ease-snap)] hover:bg-ink-2/60 lg:grid-cols-[80px_1fr_1.2fr] lg:gap-10 lg:px-4">
              <span className="font-mono text-sm text-accent">{cap.n}</span>
              <h3 className="tcolor font-display text-xl font-semibold text-paper group-hover:text-accent lg:text-2xl">
                {cap.title}
              </h3>
              <div>
                <p className="text-sm leading-relaxed text-muted lg:text-base">{cap.body}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {cap.stack.map((tool) => (
                    <span key={tool} className="chip">
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-10">
        <p className="text-sm text-muted">
          The full story is in the work —{" "}
          <Link href="/projects" className="link-slide text-accent">
            read the case studies
          </Link>{" "}
          or{" "}
          <a href={`mailto:${site.links.email}`} className="link-slide text-accent">
            email me
          </a>{" "}
          about yours.
        </p>
      </Reveal>
    </section>
  );
}
