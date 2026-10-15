---
title: "Fineract Analytics Platform"
tagline: "CDC done end to end: every OLTP change in a microfinance core streamed into ClickHouse within seconds, shaped by dbt, watched by Grafana."
summary: "Apache Fineract → PostgreSQL → Debezium/Kafka → ClickHouse → dbt marts and ML features, orchestrated by Airflow with Prometheus/Grafana observability. The whole stack starts with one command."
date: "2026-10"
tags: [Debezium, Kafka, ClickHouse, dbt, Airflow, Grafana, Docker]
repo: https://github.com/MghongoDev/fineract-analytics-platform
featured: true
order: 2
---

## Context

A microfinance institution runs its core banking on Apache Fineract. Portfolio managers need current answers (loans at risk by branch, repayment behavior, early default signals), but the OLTP database is built for transactions, not analytics, and hammering it with reporting queries is how you slow down the business.

This platform streams every change out of the OLTP core into a purpose-built ClickHouse warehouse, in near real time, with reconciliation proving that nothing was lost on the way.

## Problem

Batch snapshots were the obvious alternative, and they fail three ways:

- **Staleness.** A nightly extract means decisions made on yesterday's portfolio.
- **Load.** Full re-extracts punish the source system and don't scale with data volume.
- **Trust.** Without stage-by-stage verification, a mismatch between OLTP and warehouse is discovered by an executive, not by an engineer.

CDC solves staleness and load, but introduces its own hard questions: Is the connector running? Is replication lag growing? Did every change actually arrive in ClickHouse? Do the counts reconcile?

## Approach & Architecture

The platform is a chain where every link is observable and each stage answers exactly one verification question:

<div class="diagram"><span class="ok">Fineract API ──► ingestion ──► PostgreSQL ──WAL──► Debezium ──► Kafka ──► ClickHouse</span>
                                   │                                          │
                                   └── meta control plane          Kafka engine + MVs
                                                                              │
   Airflow ──────────────── orchestrates ─────────────►  dbt: staging → intermediate → marts / ml
                                                                              │
   Prometheus + Grafana ◄── metrics from every stage ──►  BI · ML training · dashboards</div>

- **Ingestion** pulls from the Fineract REST API into PostgreSQL with payload-hash change detection: a healthy second run shows `rows_inserted = 0, rows_updated = 0` and a large `rows_unchanged`. Unchanged records produce no write, therefore no WAL, therefore no CDC event. The control plane (`meta` schema) records every run's outcome.
- **CDC** uses Debezium on PostgreSQL's logical replication WAL into Kafka; ClickHouse consumes via Kafka engine tables and materialized views into raw tables.
- **Modeling** is dbt: staging → intermediate → marts and ML feature tables, including portfolio-at-risk by branch and a default-prediction training set that only exposes mature labels (`is_label_mature = 1`, with no label leakage into the future).
- **Observability** runs through a pipeline exporter feeding Prometheus, with Grafana dashboards for *Pipeline Health*, *CDC and Data Quality*, and *Portfolio Overview*. Verification views live in the warehouse itself: raw-table health, CDC freshness, reconciliation counts against PostgreSQL, and a `cdc_errors` table that must stay at zero.
- **Operations** are one command: `make up` builds images, starts PostgreSQL with logical replication, Kafka (KRaft), Kafka Connect, ClickHouse with its own DDL, registers the Debezium connector idempotently, brings up Airflow initialized and unpaused, then waits for every healthcheck. Source profiles swap between self-hosted Fineract, a deterministic offline mock, and the public Apache demo, by Compose profile rather than by editing files.

## Stack

- Apache Fineract, PostgreSQL (logical replication), Debezium, Kafka (KRaft), Kafka Connect
- ClickHouse (Kafka engine, materialized views), dbt, Airflow
- Prometheus, Pushgateway, Grafana; Docker Compose with profiles; GNU Make as the single entry point
- Decision records (`docs/ADR/`), a design report, and an operations runbook

## Results

- Near-real-time warehouse with mechanical trust: reconciliation counts between ClickHouse and PostgreSQL must match, replication slot lag is monitored in bytes, and `cdc_errors = 0` is a checkable invariant, not an assumption.
- Six staged verification questions, each answerable by one command or query: did the API reach PostgreSQL, is CDC streaming, did changes land in ClickHouse, did dbt build, is the output usable, is it observable.
- Analytics that answer real portfolio questions, such as the PAR ratio by branch, plus an ML training table of loan-default features with maturity-gated labels.
- The entire platform, twelve services, starts with `make up` and reports its own health before returning.

## Links

- [Source repo: github.com/MghongoDev/fineract-analytics-platform](https://github.com/MghongoDev/fineract-analytics-platform)
