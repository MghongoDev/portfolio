import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/reveal";

export const metadata: Metadata = {
  title: "Résumé",
  description: "David Mwandairo's résumé: skills across data engineering, analytics engineering, ML, and BI, with a downloadable PDF.",
};

const groups = [
  { group: "Languages", items: ["Python", "SQL", "Bash"] },
  { group: "Warehouses & stores", items: ["PostgreSQL", "ClickHouse", "DuckDB"] },
  { group: "Modeling & quality", items: ["dbt", "SCD Type 2", "Great Expectations"] },
  { group: "Orchestration & streaming", items: ["Airflow", "Kafka", "Debezium"] },
  { group: "ML & serving", items: ["scikit-learn", "FastAPI", "pytest", "Docker"] },
  { group: "BI & observability", items: ["Power BI", "DAX", "Grafana", "Prometheus"] },
  { group: "Platform", items: ["Terraform", "Git", "GitHub"] },
];

const highlights = [
  {
    text: "Built a medallion lakehouse with immutable bronze, SCD Type 2 dimensions, and point-in-time-correct joins: Airflow, dbt, DuckDB, Terraform.",
    href: "/projects/marketfeed-lakehouse",
    label: "MarketFeed Lakehouse",
  },
  {
    text: "Streamed a microfinance OLTP core into ClickHouse via Debezium/Kafka CDC, shaped it with dbt, and observed every stage in Grafana.",
    href: "/projects/fineract-analytics-platform",
    label: "Fineract Analytics Platform",
  },
  {
    text: "Took telecom churn end to end: 7,021 customers, F1 0.6129 / ROC-AUC 0.8397 with logistic regression, served through a tested FastAPI service.",
    href: "/projects/signaltel-churn-intelligence",
    label: "SignalTel Churn Intelligence",
  },
];

export default function ResumePage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-24 lg:py-32">
      <Reveal>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-faint">Résumé</p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-paper sm:text-5xl">
          One page, all signal<span className="text-accent">.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          The short version of the case studies: skills, highlights, and a PDF to forward.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <a href="/David-Mwandairo-Resume.pdf" download className="btn btn-primary press">
            Download PDF
            <span aria-hidden="true">↓</span>
          </a>
          <Link href="/contact" className="btn btn-ghost press">
            Contact
          </Link>
        </div>
      </Reveal>

      <section className="mt-16">
        <Reveal>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-paper">Skills</h2>
        </Reveal>
        <div className="mt-7 grid grid-cols-1 gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group, i) => (
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

      <section className="mt-16">
        <Reveal>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-paper">Highlights</h2>
        </Reveal>
        <div className="mt-7 space-y-6">
          {highlights.map((highlight, i) => (
            <Reveal key={highlight.label} delay={i * 70}>
              <div className="border-l-2 border-accent/40 pl-5">
                <Link href={highlight.href} className="link-slide font-display text-lg font-semibold text-paper tcolor hover:text-accent">
                  {highlight.label}
                </Link>
                <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">{highlight.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal className="mt-16 border-t border-line pt-8">
        <p className="text-sm text-muted">
          Full detail lives in the{" "}
          <Link href="/projects" className="link-slide text-accent">
            case studies
          </Link>{" "}
          and on{" "}
          <a
            href="https://github.com/MghongoDev"
            target="_blank"
            rel="noopener noreferrer"
            className="link-slide text-accent"
          >
            GitHub
          </a>
          .
        </p>
      </Reveal>
    </div>
  );
}
