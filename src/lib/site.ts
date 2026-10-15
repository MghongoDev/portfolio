export const site = {
  name: "David Mwandairo",
  role: "Data Engineer & Data Scientist",
  tagline:
    "I design pipelines, models, and dashboards that survive contact with real data — from raw API JSON to boardroom-ready answers.",
  url: "https://dmwandairo.vercel.app",
  links: {
    email: "mwandairodavid@gmail.com",
    github: "https://github.com/MghongoDev",
    githubUser: "MghongoDev",
    linkedin: "https://www.linkedin.com/in/david-mwandairo/",
  },
} as const;

export const tickerItems = [
  "Python",
  "SQL",
  "PostgreSQL",
  "ClickHouse",
  "dbt",
  "Airflow",
  "Kafka",
  "Debezium",
  "DuckDB",
  "Docker",
  "Terraform",
  "FastAPI",
  "scikit-learn",
  "Power BI",
  "Grafana",
  "Great Expectations",
  "Prometheus",
  "Git",
];

// Not a Case Study yet — shown on the Projects index only.
export const craftProject = {
  slug: "duewright",
  title: "Duewright",
  summary:
    "A task manager with one tested core and two thin interfaces — CLI and REST API over the same business logic. Phase 1: the tested core, built test-first with ADRs.",
  tags: ["Python", "pytest", "FastAPI", "Domain design"],
  repo: "https://github.com/MghongoDev/Duewright",
  year: "2026",
};
