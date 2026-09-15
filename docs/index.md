# Legalyst

## Group Identity

- Group name: 
- Senior Project


| Name | NIU | Role |
|---|---|---|
|Altaf Parves Shua Ilham| 24/536741/TK/59565 | Backend Engineer |
| Calvin  |24/532894/TK/59025 | AI Engineer |
|Diffie Alfierie Iswanto | 24/533049/TK/59056 | Frontend & UI/UX Designer |
|M Dimas Dwi Ananda |24/536904/TK/59594 | Frontend & UI/UX Designer |

## Product

**Legalyst** is a web platform that helps Indonesian F&B and retail micro and small businesses (MSMEs) figure out exactly which government licenses, certifications, and tax filings apply to them — and how to complete each one — without needing prior legal knowledge or the budget for a consultant.

Instead of navigating separate portals and dense regulatory language across OSS-RBA, KBLI 2020, PIRT, Halal certification, and annual SPT tax filing, users describe their business in plain Bahasa Indonesia. Legalyst matches this description to the correct KBLI classification, generates a personalized compliance checklist with every item traced back to its source regulation, and auto-generates the draft documents needed to fulfill each requirement.

The goal is simple: give small business owners the same clarity on compliance that larger companies get from a legal team, at a cost and complexity level that fits a warung or home-based producer.



## Background and Problem

Indonesian MSMEs in the F&B and retail sectors must deal with several separate compliance requirements: OSS-RBA business licensing, KBLI 2020 sector classification, PIRT and Halal product certification, and annual SPT tax filing. Each requirement is managed by a different government agency and described in dense regulatory language.

Larger companies can hire legal staff to handle this. A small warung or a home-based food producer usually cannot, and this often leads to unintentional non-compliance. Existing tools do not solve this problem well: most assume the user already knows what to apply for, or they cost more than an MSME can afford.

## Proposed Solution and Feature Design

Legalyst gives an F&B or retail micro or small business a single place to find out exactly which licenses, certifications, and filings apply to them, and how to complete each one. The MVP has three core features:

| Feature | Description |
|---|---|
| Smart Onboarding & Business Profiler | The user describes their business in plain Bahasa Indonesia. The description is embedded and matched against the official KBLI 2020 codebook, returning the top three candidate codes with confidence scores for the user to confirm or override. |
| Interactive Compliance Wizard | A rule engine filters the obligation table by KBLI code, business scale, and location, while vector search retrieves the relevant regulation clauses. Both feed a language model that produces a personalised, plain-language checklist in which every item cites its source regulation. Obligations the rule engine cannot confirm are flagged "verify manually" rather than dropped. |
| Auto-Document Generator | Checklist items are turned into draft documents by populating templates with the user's profile data and rendering them to PDF for download. |

## Competitor Analysis

| Competitor | Type | Product | Strengths | Weaknesses |
|---|---|---|---|---|
| OSS-RBA Portal (oss.go.id) | Direct | Official government licensing portal | Authoritative and free | Assumes the user already knows their KBLI code and which permits apply; no guidance layer |
| Easybiz.id | Direct | Paid business permit consulting service | Handles the full filing process | Priced for established companies, beyond a micro business budget |
| Justika.com | Indirect | Online legal consultation marketplace | Access to real lawyers | Per-consultation pricing and general legal scope, not a structured compliance path |

## Gantt Chart

## Project Timeline

Sprint 0 = Session 1–4 · Sprint 1 = Session 5–6 · Sprint 2 = Session 7–8 · Sprint 3 = Session 9–11 · Demo = Session 12

| Activity | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Brainstorming | ● | ● | | | | | | | | | | |
| Requirement Analysis | | ● | ● | | | | | | | | | |
| Sprint 0 — Infrastructure & Corpus | | | ● | ● | | | | | | | | |
| Sprint 1 — Business Profiler (AI) | | | | | ● | ● | | | | | | |
| Sprint 2 — Compliance Wizard (RAG) | | | | | | | ● | ● | | | | |
| Sprint 3 — Document Generator | | | | | | | | | ● | ● | | |
| Integration & Testing | | | | | | | | | | ● | ● | |
| Azure Deployment | | | ● | ● | | | | | | | ● | |
| Usability Testing | | | | | | | | | | | ● | |
| Documentation | | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| Demo Preparation | | | | | | | | | | | | ● |
