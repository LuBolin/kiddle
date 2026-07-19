import { readFile, writeFile } from "node:fs/promises";

const targetSize = 120;
const headers = { "User-Agent": "Kiddle local content importer (development)" };
const qlever = "https://qlever.cs.uni-freiburg.de/api/wikidata";
const prefixes = "PREFIX wd: <http://www.wikidata.org/entity/> PREFIX wdt: <http://www.wikidata.org/prop/direct/> PREFIX wikibase: <http://wikiba.se/ontology#> PREFIX schema: <http://schema.org/> PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>";
const configurations = {
  "western-history": {
    countries: ["Q30", "Q145", "Q142", "Q183", "Q38", "Q29"],
    cutoffYear: 1900,
    childrenPattern: "wdt:P1971 ?children;",
    childrenExpression: "?children",
    groupBy: "",
  },
  "east-asian-history": {
    countries: ["Q148", "Q17", "Q884", "Q423", "Q711"],
    cutoffYear: 1900,
    childrenPattern: "wdt:P40 ?child;",
    childrenExpression: "(COUNT(DISTINCT ?child) AS ?children)",
    groupBy: "GROUP BY ?person ?personLabel ?personDescription ?image ?sitelinks ?articleTitle",
  },
};
const slug = (value) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const plainText = (value) => value.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const tagFor = (description) => {
  const text = description.toLowerCase();
  if (/(writer|author|poet|novelist|playwright)/.test(text)) return ["literature"];
  if (/(artist|painter|sculptor|architect)/.test(text)) return ["art"];
  if (/(scientist|physicist|chemist|mathematician|inventor|engineer)/.test(text)) return ["science"];
  if (/(composer|singer|musician|conductor)/.test(text)) return ["music"];
  if (/(athlete|footballer|boxer|player|coach)/.test(text)) return ["sport"];
  if (/(king|queen|emperor|empress|monarch|royal)/.test(text)) return ["royalty"];
  if (/(president|politician|statesman|prime minister|military|general|revolutionary)/.test(text)) return ["politics"];
  return ["history"];
};
const scoreFor = (sitelinks) => sitelinks >= 180 ? 5 : sitelinks >= 100 ? 4 : sitelinks >= 50 ? 3 : 2;

async function commonsImages(files) {
  const images = new Map();
  for (let index = 0; index < files.length; index += 40) {
    const response = await fetch(`https://commons.wikimedia.org/w/api.php?${new URLSearchParams({ action: "query", format: "json", formatversion: "2", prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "480", titles: files.slice(index, index + 40).map((file) => `File:${file}`).join("|") })}`, { headers });
    if (!response.ok) throw new Error(`Wikimedia Commons request failed: ${response.status}`);
    for (const page of (await response.json()).query.pages) images.set(page.title.replace(/^File:/, "").replaceAll(" ", "_"), page.imageinfo?.[0]);
  }
  return images;
}

function imageFor(info, displayName) {
  if (!info?.thumburl || !info?.descriptionurl || !info.extmetadata?.LicenseShortName?.value) throw new Error(`Missing reusable portrait for ${displayName}`);
  return { url: info.thumburl, alt: `Portrait of ${displayName}`, licence: info.extmetadata.LicenseShortName.value, attribution: plainText(info.extmetadata.Artist?.value ?? "Wikimedia Commons contributor"), sourceUrl: info.descriptionurl };
}

for (const [category, configuration] of Object.entries(configurations)) {
  const target = new URL(`../src/data/${category}.json`, import.meta.url);
  const stored = JSON.parse(await readFile(target, "utf8"));
  const existing = stored.filter((figure) => !figure.sources?.some((source) => source.title?.startsWith("Wikidata —")));
  const existingActive = existing.filter((figure) => figure.status === "active").length;
  if (existingActive >= targetSize) {
    console.log(`${category} already has ${existingActive} active figures.`);
    continue;
  }
  const existingIds = new Set(existing.map((figure) => figure.id));
  const existingNames = new Set(existing.map((figure) => figure.displayName.toLowerCase()));
  const rows = [];
  for (const country of configuration.countries) {
    const query = `${prefixes}
SELECT ?person ?personLabel ?personDescription ?image ?sitelinks ?articleTitle ${configuration.childrenExpression} WHERE {
  ?person wdt:P31 wd:Q5; wdt:P27 wd:${country}; wdt:P569 ?birth; ${configuration.childrenPattern} wdt:P18 ?image; wikibase:sitelinks ?sitelinks.
  FILTER(YEAR(?birth) < ${configuration.cutoffYear})
  ?article schema:about ?person; schema:isPartOf <https://en.wikipedia.org/>; schema:name ?articleTitle.
  ?person rdfs:label ?personLabel. FILTER(LANG(?personLabel) = "en")
  OPTIONAL { ?person schema:description ?personDescription. FILTER(LANG(?personDescription) = "en") }
}
${configuration.groupBy}
ORDER BY DESC(?sitelinks)
LIMIT 180`;
    const response = await fetch(`${qlever}?${new URLSearchParams({ query, format: "json" })}`, { headers });
    if (!response.ok) throw new Error(`Wikidata request failed for ${category}/${country}: ${response.status}`);
    rows.push(...(await response.json()).results.bindings);
  }
  rows.sort((left, right) => Number(right.sitelinks.value) - Number(left.sitelinks.value));
  const additions = [];
  for (const row of rows) {
    const displayName = row.personLabel?.value;
    const childrenCount = Number(row.children?.value);
    const description = row.personDescription?.value ?? "Historical figure";
    if (!displayName || /^Q\d+$/.test(displayName) || !Number.isInteger(childrenCount) || childrenCount < 0 || childrenCount > 40 || existingNames.has(displayName.toLowerCase()) || (category === "western-history" && /(actor|singer|musician|athlete|footballer|boxer|comedian|model)/.test(description.toLowerCase()))) continue;
    const id = `${category}-${slug(displayName)}`;
    if (existingIds.has(id)) continue;
    const file = decodeURIComponent(new URL(row.image.value).pathname.split("/").pop());
    additions.push({
      id,
      displayName,
      descriptor: description.replace(/\s*\([^)]*\)\s*$/, ""),
      category,
      tags: tagFor(description),
      childrenCount,
      countType: "commonly-recorded",
      countingRuleSummary: `${childrenCount} ${childrenCount === 1 ? "child is" : "children are"} recorded by Wikidata.`,
      explanation: `${displayName} ${childrenCount === 1 ? "has" : "has"} ${childrenCount} ${childrenCount === 1 ? "child" : "children"} in the cited records.`,
      confidence: "medium",
      recognisabilityScore: scoreFor(Number(row.sitelinks.value)),
      status: "active",
      file,
      sources: [
        { title: `Wikipedia — ${displayName}`, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(row.articleTitle.value.replaceAll(" ", "_"))}` },
        { title: `Wikidata — ${displayName}`, url: row.person.value.replace("http://", "https://") },
      ],
    });
    existingIds.add(id);
    existingNames.add(displayName.toLowerCase());
    if (existingActive + additions.length === targetSize) break;
  }
  if (existingActive + additions.length < targetSize) throw new Error(`Only found ${existingActive + additions.length} usable ${category} figures.`);
  const images = await commonsImages([...new Set(additions.map(({ file }) => file))]);
  const generated = additions.map(({ file, ...figure }) => ({ ...figure, image: imageFor(images.get(file.replaceAll(" ", "_")), figure.displayName) }));
  await writeFile(target, `${JSON.stringify([...existing, ...generated], null, 2)}\n`);
  console.log(`Seeded ${existingActive + additions.length} active ${category} figures.`);
}
