export const site = {
  name: "David Mghongo Mwandairo",
  role: "Data Engineer & Data Scientist",
  tagline:
    "I design pipelines, models, and dashboards that survive contact with real data, from raw API JSON to boardroom-ready answers.",
  url: "https://dmwandairo.vercel.app",
  links: {
    email: "mwandairodavid@gmail.com",
    phone: "+254 705 197 185",
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

// Not a Case Study yet: shown on the Projects index only.
export const craftProject = {
  slug: "duewright",
  title: "Duewright",
  summary:
    "A task manager with one tested core and two thin interfaces, a CLI and REST API over the same business logic. The core is built test-first with ADRs; follow-up work on PostgreSQL persistence and published docs is in progress.",
  tags: ["Python", "pytest", "FastAPI", "Domain design"],
  repo: "https://github.com/MghongoDev/Duewright",
  year: "2026",
};
