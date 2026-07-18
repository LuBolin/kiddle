# Kiddle data-crawling guide

This guide creates reviewed Figure records. It does not automate factual claims: a script may fetch image metadata, but a person must select and defend every approved child count.

## Figure record

Keep every playable Figure in its category JSON file. The required shape is:

```json
{
  "id": "example-figure",
  "displayName": "Example Figure",
  "descriptor": "Short recognisable role",
  "category": "western-history",
  "tags": ["writer", "english-literature"],
  "childrenCount": 3,
  "countType": "exact",
  "countingRuleSummary": "Three documented biological children.",
  "explanation": "One short, spoiler-safe explanation shown after an answer.",
  "confidence": "high",
  "recognisabilityScore": 4,
  "status": "active",
  "image": {
    "url": "https://upload.wikimedia.org/...",
    "alt": "Portrait of Example Figure",
    "licence": "Public domain",
    "attribution": "Creator name",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:..."
  },
  "sources": [{ "title": "Authoritative source", "url": "https://example.org" }]
}
```

Use a stable, lower-case hyphenated ID. `descriptor` is a short role, not a biography. Tags are lower-case, hyphenated, and specific enough to support future filtering; for example `british-monarchy`, `scientist`, or `us-president`.

## Research workflow

1. Add a candidate as `draft` or `disabled`; never begin at `active`.
2. Find at least one authoritative biographical, museum, archive, scholarly, or institutional source for the child count. Record the direct URL, not a search-results page.
3. Apply Kiddle's counting rules: include documented biological children and reliably recognised legal adoptions; exclude stepchildren, rumours, symbolic descendants, and disputed totals.
4. If sources imply competing defensible counts, keep the Figure disabled. Do not solve uncertainty by averaging, guessing, or counting only legitimate children.
5. Write a one- or two-sentence explanation that states the selected interpretation plainly.
6. Choose tags from the Figure's role, tradition, region, or historical grouping. Tags supplement the one mandatory Category; they must not duplicate it.
7. Obtain an image from Wikimedia Commons or another approved provider. Save the file-page URL, licence, and creator attribution. Do not copy an image URL from ordinary Google or Wikipedia search results without its file page.
8. Set `status` to `active` only after the count, sources, image metadata, tags, and explanation are complete.

## Wikimedia image importer

For the current Western History pilot, add the Figure ID and Wikipedia article title to `scripts/download-portraits.mjs`, then run:

```powershell
npm run sync-portraits
npm run validate-data
```

The importer gets a resized Wikimedia image URL plus its Commons file page, licence, and creator. Review the generated Figure diff before committing it. It is intentionally limited to image metadata; it must not decide child counts or activate a Figure.

## Review gate

Run these checks before using new content in a game:

```powershell
npm run validate-data
npm test
npm run build
```

Reject any active record with a missing source, image URL, source page, licence, attribution, tags, explanation, or valid non-negative integer count. Disable a record whenever new evidence makes its approved count unclear.
