import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/reveal";
import { site } from "@/lib/site";
import fs from "node:fs";
import path from "node:path";

export const metadata: Metadata = {
  title: "Résumé",
  description:
    "David Mghongo Mwandairo's résumé: data engineering summary, skills, and experience, with a downloadable PDF.",
};

type ExperienceEntry = {
  period: string;
  role: string;
  org: string;
  summary: string;
  tags: string[];
};

const experienceFile = path.join(process.cwd(), "content", "experience.json");
const experienceJson = JSON.parse(
  fs.readFileSync(experienceFile, "utf8")
) as { entries: ExperienceEntry[] };

const summary =
  "Data Engineer with 7+ years of experience designing, developing, testing and maintaining batch, streaming and real-time data pipelines and curated analytical datasets, including in banking, financial services and other regulated data environments. Proven record delivering production ETL/ELT pipelines with Python, SQL, Apache Kafka, Apache Spark, Apache Airflow and dbt into Snowflake, BigQuery and ClickHouse, building reusable data products that power business intelligence, analytics and AI solutions, including the data infrastructure behind a proprietary credit-scoring and machine-learning system. Experienced implementing data quality controls, reconciliation, metadata, lineage and monitoring (dbt tests, Great Expectations, Prometheus, Grafana), alongside RBAC, access controls, encryption, backup, disaster recovery and SOC2-aligned auditability. Skilled in automated testing, Git source control, Docker and CI/CD to support deployments across development, testing and production environments. Collaborates with cross-functional teams and business data owners to translate business requirements into fit-for-purpose data solutions, with a strong drive to extend into unstructured data pipelines for generative AI.";

const skills = [
  {
    group: "Data Pipelines & Orchestration",
    items: [
      "Batch, Streaming & Real-Time Pipelines",
      "ETL/ELT Development",
      "Apache Kafka",
      "Apache Spark (incl. Spark Streaming)",
      "Apache Airflow",
      "dbt (Data Build Tool)",
      "Change Data Capture (Debezium)",
      "Airbyte",
      "Event-Driven Pipelines",
      "REST API & Webhook Integration",
      "Custom Python & SQL Connectors",
      "Pipeline Performance, Reliability, Scalability & Cost Optimization",
    ],
  },
  {
    group: "Data Warehousing & Modeling",
    items: [
      "Snowflake",
      "BigQuery",
      "ClickHouse (OLAP)",
      "MySQL & PostgreSQL (OLTP)",
      "Dimensional Modeling (Kimball, Star & Snowflake)",
      "Curated Analytical Datasets",
      "Reusable Data Products & Data Marts",
      "Feature Sets for ML & AI",
      "Semantic Layer",
      "Data Lake & Lakehouse Concepts",
      "NoSQL Concepts",
    ],
  },
  {
    group: "Data Quality, Governance & Observability",
    items: [
      "Data Quality Controls",
      "Reconciliation",
      "Metadata Management",
      "Data Lineage",
      "Automated Data Validation (dbt Tests, Great Expectations)",
      "Anomaly Detection",
      "Prometheus",
      "Grafana Dashboards & Alerting",
      "Monitoring & Logging",
      "Incident Response & Troubleshooting",
    ],
  },
  {
    group: "Security, Privacy & Resilience",
    items: [
      "Data Security & Privacy",
      "Role-Based Access Control (RBAC)",
      "Data Encryption (At Rest & In Transit)",
      "Data Retention",
      "Auditability",
      "High Availability & Disaster Recovery",
      "Automated Database Backups",
      "Regulatory Compliance (SOC2)",
      "Operational Resilience",
    ],
  },
  {
    group: "DevOps & Engineering Practices",
    items: [
      "CI/CD Pipeline Automation",
      "Automated Testing",
      "Git Source Control",
      "Docker Containerization",
      "Linux Infrastructure",
      "Deployments (Dev, Test, Prod)",
      "Technical Documentation & Operating Procedures",
    ],
  },
  {
    group: "Programming & Scripting",
    items: [
      "Python (Pandas, NumPy, Modular Pipeline Automation)",
      "SQL (Complex Querying & Index Tuning)",
      "Bash / Shell Scripting",
      "R for Statistical Modeling",
    ],
  },
  {
    group: "Collaboration & Leadership",
    items: [
      "Cross-Functional Collaboration with Data Owners",
      "Translating Business Requirements into Datasets",
      "Mentoring Junior Engineers",
      "Remote Team Collaboration",
      "Extreme Ownership",
    ],
  },
];

export default function ResumePage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-24 lg:py-32">
      <Reveal>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-faint">Résumé</p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-paper sm:text-5xl">
          David Mghongo Mwandairo<span className="text-accent">.</span>
        </h1>
        <p className="mt-2 font-mono text-xs uppercase tracking-[0.14em] text-muted">
          {site.role}
        </p>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">{site.tagline}</p>
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

      <Reveal className="mt-16">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-paper">Summary</h2>
        <p className="mt-4 max-w-3xl leading-relaxed text-muted">{summary}</p>
      </Reveal>

      <section className="mt-16">
        <Reveal>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-paper">Skills</h2>
        </Reveal>
        <div className="mt-7 grid grid-cols-1 gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map((group, i) => (
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
          <h2 className="font-display text-2xl font-semibold tracking-tight text-paper">Experience</h2>
        </Reveal>
        <div className="mt-7 space-y-10">
          {experienceJson.entries.map((entry, i) => (
            <Reveal key={`${entry.period}-${entry.role}`} delay={i * 70}>
              <div className="relative">
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">{entry.period}</p>
                <h3 className="mt-2 font-display text-lg font-semibold text-paper">{entry.role}</h3>
                <p className="mt-1 text-sm text-muted">{entry.org}</p>
                <p className="mt-3 leading-relaxed text-muted">{entry.summary}</p>
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
      </section>

      <section className="mt-16 border-t border-line pt-10">
        <Reveal>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-paper">Contact</h2>
          <p className="mt-4 text-muted">Reach me by the channels on this site. The PDF above holds the forwardable detail.</p>
        </Reveal>
      </section>

      <Reveal className="mt-16 border-t border-line pt-8">
        <p className="text-sm text-muted">
          Full detail lives in the{" "}
          <Link href="/projects" className="link-slide text-accent">
            case studies
          </Link>{" "}
          and on{" "}
          <a
            href={site.links.github}
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
