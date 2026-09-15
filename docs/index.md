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
