# Obligations corpus — fill-in rules

`TEMPLATE_obligations.csv` is the shared format for #13 (OSS-RBA), #14 (PIRT), and #15 (Halal + SPT). One row = one atomic obligation. Don't group multiple requirements into a single row — the rule engine and checklist both operate per-row.

## Columns

| Column | Required? | Format |
|---|---|---|
| `obligation_id` | Yes | `<TRACK>-<3-digit number>`, e.g. `OSS-001`, `PIRT-014`, `HALAL-003`, `SPT-007`. Unique across the whole table, not just within a track. |
| `track` | Yes | One of: `OSS`, `PIRT`, `HALAL`, `SPT`. |
| `kbli_scope` | Yes | One or more KBLI 2025 5-digit codes, comma-separated (e.g. `10111,10112`), or `ALL` if the obligation applies to every KBLI code in scope. |
| `business_scale` | Yes | One or more of `mikro`, `kecil`, comma-separated, or `ALL` if scale-independent. (MVP scope is micro + small only — don't add `menengah`/`besar` rows.) |
| `risk_tier` | Only for `track = OSS` | One of `rendah`, `menengah rendah`, `menengah tinggi`, `tinggi` (OSS-RBA risk tiers). Leave blank for PIRT/HALAL/SPT rows. |
| `requirement_text` | Yes | Plain-language Bahasa Indonesia description of what the business must do. Paraphrase — don't paste raw legal text; this is what the user sees on their checklist. |
| `issuing_agency` | Yes | The responsible body, e.g. `Kementerian Investasi/BKPM`, `BPOM`, `BPJPH`, `Ditjen Pajak`. |
| `source_url` | Yes | Direct link to the regulation or official page. Every checklist item must trace back to a source (PRD requirement). |
| `source_article` | Yes, unless noted | Specific pasal/ayat. May be left blank only when the requirement comes from a general portal instruction with no citable article — explain why in `notes` when blank. |
| `notes` | Optional | Use for ambiguous cases, scope caveats, or to flag a row as a "verify manually" candidate instead of dropping it. |

## Status

This is a first draft based on the column list already agreed in #8's acceptance criteria — the row-level rules above (blank-field policy, ID format, scale values) still need a quick thumbs-up from the group before #13/#14/#15 start, since all three depend on everyone filling rows the same way.
