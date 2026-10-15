---
title: "SignalTel Churn Intelligence"
tagline: "An end-to-end churn model for a telecom: leakage-safe pipelines, honest model selection, and a production FastAPI service."
summary: "7,021 customers scored; logistic regression chosen over gradient boosting for recall; F1 0.6129 and ROC-AUC 0.8397, served through a documented FastAPI service in Docker."
date: "2026-08"
tags: [scikit-learn, FastAPI, Machine Learning, Docker, pytest]
cover: /assets/signaltel/churn-distribution.png
repo: https://github.com/MghongoDev/SignalTel-Churn-Intelligence
demo: https://signaltel-churn-intelligence-1.onrender.com/
featured: true
order: 3
---

## Context

A telecommunications company wants to know which customers are about to leave. The dataset is the classic telco profile: 7,043 customers, 26.5% of whom churned, a meaningful class imbalance that shapes every decision downstream.

This project takes the problem end to end: EDA, cleaning, leakage-safe feature engineering, model selection, persistence, and a deployed REST service with a browser dashboard.

## Problem

Churn modeling punishes three common shortcuts:

- **Accuracy lies under imbalance.** With 73.5% "no churn" rows, a model that predicts "everyone stays" scores 0.735 accuracy and is perfectly useless: it never identifies a churner.
- **Leakage inflates offline scores.** Any feature that encodes post-churn information (or statistics computed over the full dataset before splitting) produces beautiful cross-validation numbers that evaporate in production.
- **Notebooks are not products.** A model that lives only in a notebook can't be queried by the retention team, can't be regression-tested, and dies on the author's machine.

## Approach & Architecture

**EDA first, hypotheses second.** The exploration surfaced the drivers before any model was trained: customers under 10 months of tenure churn dramatically more; month-to-month contracts churn at ~42% versus ~3% for two-year contracts; fiber optic customers churn at ~42%; electronic-check payers at ~45%.

![Churn distribution across the customer base](/assets/signaltel/churn-distribution.png)

![Churn rate by contract type](/assets/signaltel/churn-by-contract.png)

**Leakage-safe pipelines.** All preprocessing (scaling, encoding, imputation) lives inside scikit-learn `Pipeline` objects fitted on training folds only, so no statistic from validation or test data can leak into features.

**Honest model selection.** Three candidates were trained and compared on the same held-out test set:

| Model               | Accuracy | Precision | Recall | F1     | ROC-AUC |
| ------------------- | -------- | --------- | ------ | ------ | ------- |
| Logistic Regression | 0.7402   | 0.5061    | 0.7769 | 0.6129 | 0.8397  |
| Random Forest       | 0.7744   | 0.6007    | 0.4409 | 0.5085 | 0.8149  |
| Gradient Boosting   | 0.7929   | 0.6401    | 0.4973 | 0.5598 | 0.8351  |

Gradient boosting wins on accuracy; **logistic regression wins on the metric that matters**. For churn intervention, a missed churner is an unrecovered customer, so recall leads, and the linear model catches 78% of churners versus 44% for the forest. Selected: logistic regression, F1 0.6129, ROC-AUC 0.8397.

**Served, not shelved.** The winning pipeline persists as `churn_pipeline.joblib` behind a FastAPI service: typed input validation, Swagger and ReDoc docs, a browser dashboard for single-customer predictions, seven pytest tests, and a Dockerfile. The whole lifecycle reruns from one directory with `pip install -r requirements.txt` and four commands.

## Stack

- Python, scikit-learn (pipelines, Logistic Regression / Random Forest / Gradient Boosting), joblib
- FastAPI with OpenAPI documentation, pytest, Docker
- EDA scripted and reproducible (`notebooks/01_eda_analysis.py`), not one-off cells

## Results

- **7,021 customers** cleaned and scored (one duplicate removed from 7,043); churn rate 26.5% handled explicitly through metric choice rather than ignored.
- A deployed service where the retention team's "who do we call?" question gets a probability, a recommendation, and the model's key metrics, reachable as a live demo, not a screenshot.
- A selection decision written down and defensible: recall over accuracy, with the numbers to prove why.
- Every artifact reproducible: data → EDA → training → tests → container, in order, from source.

## Links

- [Live demo: signaltel-churn-intelligence-1.onrender.com](https://signaltel-churn-intelligence-1.onrender.com/)
- [Source repo: github.com/MghongoDev/SignalTel-Churn-Intelligence](https://github.com/MghongoDev/SignalTel-Churn-Intelligence)
