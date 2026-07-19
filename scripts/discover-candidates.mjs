import { mkdir, writeFile } from "node:fs/promises";

const input = process.argv.slice(2);
const argumentsByName = new Map(input.flatMap((value, index, values) => value.startsWith("--") ? [[value.slice(2), values[index + 1]]] : []));
const positional = input.filter((value) => !value.startsWith("--") && !input.includes(`--${value}`));
const category = argumentsByName.get("category") ?? positional[0];
const target = Number(argumentsByName.get("target") ?? positional[1]);
const multiplier = Number(argumentsByName.get("multiplier") ?? positional[2] ?? 3);

if (category !== "east-asian-history" || !Number.isInteger(target) || target < 1 || !Number.isInteger(multiplier) || multiplier < 1) {
  console.error("Usage: node scripts/discover-candidates.mjs east-asian-history 200 [3]");
  process.exit(1);
}

const candidateTarget = target * multiplier;
const queryLimit = candidateTarget + 50;
const query = `
SELECT DISTINCT ?person ?personLabel ?zhLabel ?birth ?sitelinks ?enArticle ?zhArticle WHERE {
  VALUES ?country { wd:Q148 wd:Q17 wd:Q884 wd:Q423 wd:Q711 }
  ?person wdt:P31 wd:Q5;
          wdt:P27 ?country;
          wdt:P569 ?birth.
  FILTER(YEAR(?birth) < 1900)
  ?person wikibase:sitelinks ?sitelinks.
  ?enArticle schema:about ?person; schema:isPartOf <https://en.wikipedia.org/>.
  ?zhArticle schema:about ?person; schema:isPartOf <https://zh.wikipedia.org/>.
  OPTIONAL { ?person rdfs:label ?zhLabel. FILTER(LANG(?zhLabel) = "zh") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY DESC(?sitelinks) DESC(?birth)
LIMIT ${queryLimit}`;

const endpoint = new URL("https://query.wikidata.org/sparql");
endpoint.searchParams.set("format", "json");
endpoint.searchParams.set("query", query);
const response = await fetch(endpoint, {
  headers: { "user-agent": "Kiddle-data-pilot/0.1 (local research; https://kid-dle.vercel.app)" },
});

if (!response.ok) throw new Error(`Wikidata discovery failed: ${response.status} ${response.statusText}`);

const payload = await response.json();
const candidates = payload.results.bindings
  .filter((row) => row.personLabel?.value && row.personLabel.value !== row.person.value.split("/").at(-1) && row.zhLabel?.value)
  .slice(0, candidateTarget)
  .map((row) => ({
  wikidataId: row.person.value.split("/").at(-1),
  name: { en: row.personLabel.value, zh: row.zhLabel?.value ?? null },
  born: row.birth.value.slice(0, 10),
  sitelinks: Number(row.sitelinks.value),
  articles: { en: row.enArticle.value, zh: row.zhArticle.value },
  discoveryStatus: "unverified",
  discoveryReason: "East Asian person born before 1900 with English and Chinese Wikipedia articles; child count not yet verified.",
  }));

const outputDirectory = new URL("../data/candidates/", import.meta.url);
await mkdir(outputDirectory, { recursive: true });
const output = new URL(`${category}.json`, outputDirectory);
await writeFile(output, `${JSON.stringify({ category, target, candidateTarget, generatedAt: new Date().toISOString(), candidates }, null, 2)}\n`);
console.log(`Discovered ${candidates.length} unverified ${category} candidates at ${output.pathname}`);
