# Bilingual category data pipeline

## Goal

Given a Kiddle category ID and target count `X`, produce **X active, playable Figure records** with:

- a clearly documented child count;
- English and Chinese reader-facing text;
- an approved portrait and licence metadata;
- at least one direct supporting source;
- tags, confidence, and a stable ID; and
- no duplicate figure, source-only placeholder, or unresolved counting dispute.

The pipeline should make bulk collection economical without treating an LLM as a source of truth. Scripts collect and validate facts; **OpenCode using DeepSeek** prepares candidate triage and structured drafts from supplied evidence; a reviewer approves the final child count before a record becomes active. Do not use GPT for automated data collection or drafting in this pipeline.

## Scope and success criteria

### Input

```text
category: modern-celebrities
target: 200
```

Optional controls:

```text
candidateMultiplier: 3
languageTargets: en, zh
minimumConfidence: high
allowMythology: false
```

### Output

One category file containing at least `X` records with `status: "active"`, plus a review manifest recording the evidence and decision for every rejected or deferred candidate.

For a target of 200, the pipeline is successful only when all of these are true:

- at least 200 active records pass `npm run validate-data`;
- every active record has a non-negative integer `childrenCount` and a direct source URL;
- every active record has complete `text.en` and `text.zh` fields;
- every active record has an approved image URL, Commons/file source URL, licence, and attribution;
- every active record can form at least one non-tied matchup in its category; and
- all candidate and review decisions are reproducible from saved manifests.

Do not silently substitute lower-quality people just to reach `X`. If a category produces fewer than `X` defensible records, report the shortfall and retain the remainder as `disabled` drafts.

## Canonical record shape

The final source of truth is one record per figure, never separate English and Chinese records.

```json
{
  "id": "jane-example",
  "category": "modern-celebrities",
  "tags": ["singer", "american"],
  "childrenCount": 2,
  "countType": "exact",
  "confidence": "high",
  "recognisabilityScore": 4,
  "status": "active",
  "text": {
    "en": {
      "displayName": "Jane Example",
      "descriptor": "American singer",
      "countingRuleSummary": "Two documented children.",
      "explanation": "Two children are documented by the cited biographical source.",
      "imageAlt": "Portrait of Jane Example"
    },
    "zh": {
      "displayName": "简·示例",
      "descriptor": "美国歌手",
      "countingRuleSummary": "有文献记录的两名子女。",
      "explanation": "引用的传记资料记载其有两名子女。",
      "imageAlt": "简·示例的肖像"
    }
  },
  "image": {
    "url": "https://upload.wikimedia.org/...",
    "licence": "Public domain",
    "attribution": "Creator name",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:..."
  },
  "sources": [
    {
      "url": "https://example.org/biography",
      "sourceLanguage": "en",
      "title": {
        "en": "Authoritative biography",
        "zh": "权威传记资料"
      }
    }
  ]
}
```

Shared facts (`childrenCount`, tags, category, source URLs, image metadata, confidence, and status) appear once. Only reader-facing copy is localized.

## Data directories and artifacts

Create these generated-but-reviewable artifacts. Keep raw acquisition data separate from playable game data.

```text
data/
  candidates/
    modern-celebrities.jsonl
    western-history.jsonl
  evidence/
    modern-celebrities.jsonl
  drafts/
    modern-celebrities.json
  reviews/
    modern-celebrities.jsonl
src/data/
  modern-celebrities.json
  western-history.json
scripts/
  discover-candidates.mjs
  collect-evidence.mjs
  draft-records.mjs
  import-approved-records.mjs
  validate-data.mjs
```

Do not commit transient HTML responses, model chat logs containing unnecessary page copies, API tokens, or local environment files. Commit candidate, evidence, review, and final-record manifests when they are useful for reproducibility and are safe to publish.

## Pipeline stages

### 1. Define the category contract

Before collecting candidates, add a category profile to a small checked-in configuration file.

```json
{
  "id": "modern-celebrities",
  "candidateTarget": 600,
  "activeTarget": 200,
  "fameSignals": ["English Wikipedia sitelink", "Chinese Wikipedia sitelink", "Wikimedia portrait", "award or recognised occupation"],
  "allowedSourceDomains": ["official sites", "major publishers", "institutions", "reputable biographies"],
  "excludedTags": ["private-person", "unverified-family-claim"],
  "countingRule": "Documented biological children and reliably recognised legal adoptions; no stepchildren or rumours."
}
```

For mythology, the profile must additionally name the tradition and approved reference corpus. A figure such as a deity should never receive one synthetic count merged across incompatible versions.

### 2. Discover a surplus of candidates programmatically

Run discovery with `candidateTarget = max(X * 3, X + 100)`. A target of 200 should normally begin with 600 candidates.

Use Wikidata as the discovery index, not as the final proof of a child count. Query for category-appropriate entities with useful signals:

- entity ID and canonical labels;
- dates, occupations, nationality or culture where applicable;
- English and Chinese sitelinks;
- Commons image/entity identifiers;
- available children-count statements and their references;
- popularity signals such as sitelinks, article length proxies, or curated lists.

Store each candidate as JSON Lines with its Wikidata ID, discovery score, proposed tags, relevant article URLs, and raw source references. De-duplicate by Wikidata ID first, then by normalized canonical name.

### 3. Triage with OpenCode + DeepSeek, then rank for recognisability and category fit

Run the candidate manifest through OpenCode with `deepseek/deepseek-reasoner`. At discovery, DeepSeek may rank existing candidate IDs only; it must not claim a family fact, propose a tag, create a source, or make a record active.

```powershell
opencode run -m deepseek/deepseek-reasoner "Read data/candidates/east-asian-history.json. Return JSON only: {\"prioritizedCandidateIds\":[...]} containing 20 existing Wikidata IDs. Do not include names, reasons, child counts, tags, sources, or any other facts."
```

Use `deepseek/deepseek-chat` for the later bilingual-copy batch when cost and speed matter; use `deepseek/deepseek-reasoner` when resolving evidence-packet conflicts. Keep both model outputs as reviewable drafts, not sources of truth.

Score each candidate before expensive research. Use transparent, deterministic rules where possible.

Example score:

```text
+ 3  English and Chinese article available
+ 2  usable Commons image identified
+ 2  child-count statement with a cited reference
+ 1  high-confidence category/occupation match
+ 1  broad public recognisability signal
- 4  clearly disputed family count
- 3  insufficient category fit
- 2  no usable source path
```

Keep the top surplus candidates for evidence collection. The script must preserve the rejected candidates and reason, rather than deleting them.

### 4. Collect evidence packets

For every retained candidate, fetch only material needed for review:

- direct biography or institutional source URLs;
- short relevant excerpts/structured fields identifying the child count;
- page title and source language;
- Commons file page, direct image URL, licence, and attribution;
- candidate tags and category rationale.

An evidence packet must distinguish:

```json
{
  "candidateId": "Q...",
  "childCountClaims": [
    {
      "count": 2,
      "url": "https://...",
      "title": "...",
      "excerpt": "short evidence only",
      "sourceType": "institutional-biography",
      "retrievedAt": "2026-07-19"
    }
  ],
  "imageEvidence": { "...": "..." },
  "collectionStatus": "ready-for-draft"
}
```

Never scrape or store more copyrighted page text than the review requires. Respect site terms, robots controls, rate limits, and API policies. Prefer official APIs, Wikidata, Wikipedia/Commons APIs, and institutional pages over brittle HTML scraping.

### 5. Draft records with OpenCode + DeepSeek

DeepSeek should receive **only** the candidate and evidence packet, not an open-ended instruction to browse and guess. Invoke it through OpenCode with a configured `deepseek/...` model; do not substitute GPT.

Its job is to produce a JSON draft with:

- normalized stable ID;
- tags and recognisability score;
- English and Chinese display text;
- concise counting-rule summary and explanation in both languages;
- selected child count only when the evidence packet supports one unambiguous count;
- source display titles in English and Chinese where appropriate; and
- `status: "disabled"` by default.

Required model instruction:

```text
Use only the supplied evidence packet. Do not infer a count, fill missing fields from memory,
invent a citation, or promote a record to active. If evidence conflicts or is insufficient,
set reviewReason and leave childrenCount/status unresolved/disabled as required by schema.
Return JSON only.
```

Batch in small groups (for example 20–50 candidates). Save input and output manifests so a failed or weak batch can be regenerated with another model without contaminating final data.

### 6. Deterministic validation before review

`npm run validate-data` should grow from a structural validator into a release gate. It should reject a draft or final record when it has:

- invalid, duplicate, or unstable ID;
- category mismatch;
- missing or malformed English/Chinese fields;
- a non-integer/negative child count;
- incomplete source or image metadata;
- an unapproved image host or missing Commons file page;
- absent tags;
- active status with low confidence or unresolved review reason;
- localized factual fields that differ from shared facts; or
- no possible non-tied matchup in the enabled category.

Separate validation output into `error`, `warning`, and `needs-review`; only errors block import, while warnings feed the review queue.

### 7. Human factual review

Reviewers work from a compact queue, not raw web search.

For each record, approve one of:

- `approve`: source directly supports the count and counting rule;
- `revise`: draft wording/tag/image needs correction;
- `needs-more-evidence`: source is inadequate or conflicts;
- `reject`: not famous enough, wrong category, privacy concern, or irreconcilable count.

Required reviewer checks:

1. Does the cited source actually support this exact child count?
2. Does the count obey Kiddle’s counting rule?
3. Is the source direct and reputable enough for the category?
4. Is the image source/licence correct?
5. Do English and Chinese say the same thing?
6. Is the person recognizable and category-appropriate?

Only an approved record moves from `disabled` to `active`. Preserve the reviewer identity/date and decision reason in the review manifest; do not expose internal reviewer notes in the public game bundle.

### 8. Import approved records

`import-approved-records.mjs` should:

- read approved review decisions;
- merge records into the category JSON file by stable ID;
- preserve existing records unless the import explicitly supersedes them;
- refuse a conflicting child count without an explicit review decision;
- set `status: "active"` only for approved records; and
- print a summary: requested target, active total, disabled total, rejected total, and shortfall.

Run the full quality gate after every import:

```powershell
npm run validate-data
npm test
npm run build
```

## Recommended first implementation order

1. **Migrate the current data contract** to the bilingual `text.en`/`text.zh` shape described in `data-crawling-guide.md`.
2. **Extend the validator** before collecting new data; otherwise large batches create unreviewable debt.
3. **Implement candidate discovery** for `modern-celebrities` and `western-history` only.
4. **Implement Commons image metadata collection** using the existing portrait importer as the base.
5. **Define the evidence-packet format** and write its collector.
6. **Create the OpenCode/DeepSeek batch prompt and JSON parser**; all records remain disabled.
7. **Build a review manifest/CLI** with approve, revise, defer, and reject decisions.
8. **Import an initial 25-record pilot per category**, validate, playtest, and inspect sources.
9. **Scale to 200 active records per category** only after the pilot creates clean records without recurring schema or sourcing problems.
10. Add East Asian history, East Asian mythology, and Western mythology one category at a time, with source rules specific to each tradition.

## Per-category execution playbook

For `category=C` and `target=X`:

```powershell
npm run discover-candidates -- --category C --target X --multiplier 3
npm run collect-evidence -- --category C
npm run draft-records -- --category C --provider opencode-deepseek
npm run validate-data -- --stage draft --category C
npm run review-queue -- --category C
npm run import-approved-records -- --category C --target X
npm run validate-data
npm test
npm run build
```

The exact command names can change during implementation, but the stage boundaries should not: discovery, evidence, draft, validation, review, import, release check.

## Operational safeguards

- Rate-limit every external source and cache successful fetches by URL.
- Keep API keys in ignored environment files only; never pass them to an LLM prompt or commit them.
- Record source retrieval date because pages change.
- Use `disabled` as the safe default at every automated stage.
- Flag living people and sensitive family claims for stricter sourcing.
- Do not use search result snippets as evidence.
- Do not allow the batch model to write directly into `src/data/*.json`.
- Require a clean Git diff and validator report before importing active records.
- Sample-review already approved records periodically to detect systematic model or source errors.

## Capacity estimate

For a target of 200 active records:

```text
600 candidates discovered
350–450 evidence packets likely usable
250–320 disabled drafts likely generated
200+ records approved and activated
```

The exact yield will be lower for mythology and categories with disputed genealogies. Plan category targets independently; do not assume one category’s yield applies to another.

## Definition of done for a category

A category is ready for launch only when it has `X` validated active records, the review manifest has no unresolved active records, Quick and Infinite can run against it, Daily can create ten valid themed questions, and a bilingual human read-through finds no misleading count, translation, source, or image-credit issue.
