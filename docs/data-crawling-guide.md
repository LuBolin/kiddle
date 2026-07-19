# Kiddle data-crawling guide

This guide creates reviewed Figure records. It does not automate factual claims: a script may fetch image metadata, but a person must select and defend every approved child count.

## Canonical Figure record

Keep every playable Figure in its category JSON file. A person has one record and one stable ID across every language. Facts, classifications, images, and source URLs are stored once; only reader-facing text is localized.

The target shape for all new and migrated data is:

```json
{
  "id": "example-figure",
  "category": "western-history",
  "tags": ["writer", "english-literature"],
  "childrenCount": 3,
  "countType": "exact",
  "confidence": "high",
  "recognisabilityScore": 4,
  "status": "active",
  "text": {
    "en": {
      "displayName": "Example Figure",
      "descriptor": "Short recognisable role",
      "countingRuleSummary": "Three documented biological children.",
      "explanation": "One short, spoiler-safe explanation shown after an answer.",
      "imageAlt": "Portrait of Example Figure"
    },
    "zh": {
      "displayName": "示例人物",
      "descriptor": "简短、易识别的身份",
      "countingRuleSummary": "有文献记录的三名亲生子女。",
      "explanation": "作答后显示的一段简短说明。",
      "imageAlt": "示例人物肖像"
    }
  },
  "image": {
    "url": "https://upload.wikimedia.org/...",
    "licence": "Public domain",
    "attribution": "Creator name",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:..."
  },
  "sources": [{
    "url": "https://example.org",
    "sourceLanguage": "en",
    "title": {
      "en": "Authoritative source",
      "zh": "权威资料来源"
    }
  }]
}
```

Use a stable, lower-case hyphenated ID. `descriptor` is a short role, not a biography. Tags are lower-case, hyphenated, and specific enough to support future filtering; for example `british-monarchy`, `scientist`, or `us-president`.

### Localization rules

- Never create separate English and Chinese Figure records. They would drift on counts, tags, status, images, and source URLs.
- `text.en` is the required fallback locale. The application resolves `text[selectedLanguage]`, then falls back field-by-field to `text.en`.
- A Figure may remain `disabled` while Chinese copy is incomplete. Before bilingual data is declared launch-ready, every `active` Figure must have reviewed `text.en` and `text.zh` fields.
- Translate names using a recognised conventional name where one exists. Preserve the original name or an accepted transliteration when no established Chinese form exists.
- Translate explanations and counting rules for meaning, not word-for-word phrasing. Both locales must describe the same approved count and editorial interpretation.
- Source URLs, child counts, categories, tags, image files, licences, attribution, confidence, and status are shared facts and must never be localized.
- A source title may be localized for display, but `sourceLanguage` records the language of the linked page. Do not imply that an English source URL contains Chinese text.
- Image alternative text belongs under `text.<language>.imageAlt`; the image URL and rights metadata remain shared.

### Migration status

The active category data uses this canonical localized shape. Do not add legacy top-level English fields (`displayName`, `descriptor`, `countingRuleSummary`, `explanation`, or `image.alt`) back into a Figure record. The renderer falls back field-by-field to `text.en`; the validator requires complete English and Simplified Chinese text for every active Figure.

## Research workflow

1. Add a candidate as `disabled`; never begin at `active`.
2. Find at least one authoritative biographical, museum, archive, scholarly, or institutional source for the child count. Record the direct URL, not a search-results page.
3. Apply Kiddle's counting rules: include documented biological children and reliably recognised legal adoptions; exclude stepchildren, rumours, symbolic descendants, and disputed totals.
4. If sources imply competing defensible counts, keep the Figure disabled. Do not solve uncertainty by averaging, guessing, or counting only legitimate children.
5. Write the English explanation and counting rule first, then create reviewed Chinese text that states the same interpretation plainly.
6. Choose tags from the Figure's role, tradition, region, or historical grouping. Tags supplement the one mandatory Category; they must not duplicate it.
7. Obtain an image from Wikimedia Commons or another approved provider. Save the file-page URL, licence, and creator attribution. Do not copy an image URL from ordinary Google or Wikipedia search results without its file page.
8. Set `status` to `active` only after the count, sources, image metadata, tags, and required localized text are complete.

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

Reject any active record with a missing source, image URL, source page, licence, attribution, tags, required localized text, or valid non-negative integer count. Reject duplicate IDs across locales and localized fields that disagree on the approved count. Disable a record whenever new evidence makes its approved count unclear.
