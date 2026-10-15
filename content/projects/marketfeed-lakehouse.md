---
title: "MarketFeed Lakehouse"
tagline: "A production-grade medallion lakehouse that turns rate-limited market APIs into an auditable, tested analytics warehouse."
summary: "Medallion architecture over Alpha Vantage and FRED data: immutable bronze, SCD Type 2 dimensions, and point-in-time-correct marts, orchestrated by Airflow and modeled in dbt."
date: "2026-09"
tags: [Python, Airflow, dbt, DuckDB, SCD Type 2, Great Expectations, Docker, Terraform]
cover: /assets/marketfeed/medallion-carousel.png
repo: https://github.com/MghongoDev/marketfeed-lakehouse
featured: true
order: 1
---

## Context

Market analysis needs two kinds of data that behave badly: daily OHLCV prices from Alpha Vantage, and macroeconomic series from FRED. Both are free, both are rate-limited, and both have quirks. Alpha Vantage's compact mode returns the last 100 days on every call, quietly overlapping with previous pulls, and FRED corrections can rewrite history after the fact.

MarketFeed Lakehouse ingests both into a layered warehouse where downstream consumers get clean, typed, historically-truthful marts: daily price summaries with rolling metrics, sector performance, and macro-market correlations.

## Problem

A naive load script fails this problem in three distinct ways:

- **Overlap duplication.** Every compact-mode call re-delivers the last 100 days. Load twice and `(ticker, trade_date)` rows silently multiply. Aggregates drift without any error anywhere.
- **Backfilled corrections.** APIs correct historical values later. If you transform on the way in, there is no way to know what the API originally said, and no way to replay.
- **Retroactive lies.** A company's sector changes. Join today's classification onto last year's prices and every historical sector return is quietly wrong.

## Approach & Architecture

The lakehouse follows the medallion pattern with a deliberate rule: **bronze is sacred.**

![MarketFeed Lakehouse architecture: external APIs flow through Airflow-orchestrated ingestion, bronze Parquet, dbt transformations, and DuckDB for SQL consumers](/assets/marketfeed/architecture.svg)

- **Bronze** lands raw API responses as-is: string-typed, append-only, partitioned by *ingestion date*, not trade date. Partitioning by ingestion date preserves the audit question ("what did the API say when we asked?") even when the API backfills or corrects history. Storage is traded for resilience: a downstream bug means reprocessing, never re-fetching a rate-limited API.
- **Silver** deduplicates via window functions, keeping the most recent ingestion per `(ticker, trade_date)`, then types and conforms. Slowly-changing dimensions use **dbt snapshots for SCD Type 2** rather than hand-rolled MERGE logic: validity windows come out immutable and testable.
- **Gold** builds consumption marts: `daily_price_summary` (OHLCV plus 7d/30d moving averages and volatility), `sector_performance` with **point-in-time-correct joins** that match sector classification to each historical date via SCD2 validity windows, and `macro_market_correlation` using as-of joins.

Orchestration is Airflow; transformations are dbt; data quality is gated by **Great Expectations freshness checks** in front of consumers; infrastructure is declared with Terraform.

## Stack

- Python 3.11, Airflow, dbt (snapshots, seeds, tests, docs), DuckDB
- MinIO + PostgreSQL (Docker) for object storage and metadata
- Great Expectations for freshness and quality gates
- Terraform, pytest, Graphviz-generated architecture diagrams

## Results

- A full lineage-documented warehouse, from bronze (2 raw tables) through silver (typed, deduplicated, SCD2 dimension) to gold (3 marts), where every grain is explicit: one row per `(ticker, trade_date)`, one per `(series_id, observation_date)`, one per `(ticker, valid_from, valid_to)`.
- Correctness that holds under the API's worst behavior: overlapping compaction windows deduplicate cleanly, and historical sector returns are point-in-time-correct by construction, not by discipline.
- Verification is mechanical: dbt tests across layers, Great Expectations freshness gates, pytest coverage on the ingestion modules, and dbt docs for interactive lineage.
- The medallion flow is explained record-by-record, with one AAPL row followed from raw JSON through silver typing to a gold aggregate, because a pipeline you can narrate is a pipeline you can debug.

## Links

- [Source repo: github.com/MghongoDev/marketfeed-lakehouse](https://github.com/MghongoDev/marketfeed-lakehouse)
