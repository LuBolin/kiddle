import { readFile, writeFile } from "node:fs/promises";

const target = new URL("../src/data/modern-celebrities.json", import.meta.url);
const curated = JSON.parse(await readFile(target, "utf8")).filter((figure) => figure.confidence === "high");
const reserved = JSON.parse(await readFile(new URL("../src/data/western-history.json", import.meta.url), "utf8"));
const headers = { "User-Agent": "Kiddle local content importer (development)" };
const plainText = (value) => value.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const slug = (value) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const candidateIds = `Q76 Q22686 Q9960 Q207 Q6279 Q9696 Q8007 Q5284 Q5816 Q5809 Q1124 Q615 Q567 Q3874799 Q11571 Q30487 Q23685 Q317521 Q6294 Q23505 Q329 Q10853588 Q1744 Q9588 Q9049 Q8440 Q1058 Q36740 Q34086 Q5608 Q36153 Q8006 Q34660 Q43274 Q1254 Q1317 Q26876 Q36844 Q13909 Q35332 Q37079 Q40096 Q37175 Q36949 Q43203 Q8877 Q55800 Q19848 Q23215 Q5105 Q2599 Q128193 Q483203 Q392 Q873 Q37233 Q2685 Q40083 Q43416 Q38111 Q40523 Q37459 Q42101 Q48337 Q172678 Q81328 Q41421 Q52929 Q192745 Q11459 Q134183 Q206112 Q1426 Q54544 Q20579 Q200085 Q18543 Q17167 Q33999 Q146236 Q151221 Q15935 Q15901 Q170572 Q49944 Q82037 Q155659 Q189330 Q131285 Q10738 Q95043 Q58444 Q41142 Q103301 Q23848 Q25191 Q24568 Q55400 Q180453 Q60410 Q36215 Q39829 Q482980 Q23434 Q312556 Q302282 Q208294 Q104123 Q190694 Q229256 Q29584 Q40887 Q222749 Q19020 Q18645 Q152316 Q191039 Q153330 Q457786 Q29445 Q342617 Q178166 Q23659 Q128320 Q229097 Q31167 Q106706 Q160123 Q108552 Q450675 Q122702 Q34787 Q223455 Q319427 Q230188 Q31328 Q11696 Q2259 Q55245 Q4964182 Q38104 Q42992 Q19099 Q1028181 Q109232 Q186316 Q202371 Q852190 Q202725 Q44068 Q60186 Q181132 Q196185 Q279548 Q234767 Q174843 Q230881 Q212989 Q214678 Q202148 Q2685 Q40083 Q52926 Q967467 Q483203 Q41148 Q213812 Q16759 Q186186 Q297775 Q312556`.split(" ");
candidateIds.push(...`Q9916 Q11613 Q9582 Q9640 Q34296 Q7416 Q264766 Q34644`.split(" "));
candidateIds.push(...`Q42869 Q41163 Q41180 Q28493 Q34012`.split(" "));
candidateIds.push(...`Q7243 Q892 Q7317 Q7315`.split(" "));
const query = `
SELECT ?person ?personLabel ?personDescription ?children ?image ?sitelinks ?articleTitle WHERE {
  VALUES ?person { ${candidateIds.map((id) => `wd:${id}`).join(" ")} }
  ?person wdt:P31 wd:Q5; wdt:P1971 ?children; wdt:P18 ?image; wikibase:sitelinks ?sitelinks.
  FILTER(?children >= 0 && ?children <= 30)
  ?article schema:about ?person; schema:isPartOf <https://en.wikipedia.org/>; schema:name ?articleTitle.
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY DESC(?sitelinks)`;

const sparql = await fetch(`https://query.wikidata.org/sparql?${new URLSearchParams({ query, format: "json" })}`, { headers });
if (!sparql.ok) throw new Error(`Wikidata request failed: ${sparql.status}`);
const bindings = (await sparql.json()).results.bindings;
const grouped = new Map();
for (const row of bindings) {
  const id = row.person.value;
  const group = grouped.get(id) ?? [];
  group.push(row);
  grouped.set(id, group);
}
const rows = [...grouped.values()].filter((group) => new Set(group.map((row) => row.children.value)).size === 1).map((group) => group[0]).sort((left, right) => Number(right.sitelinks.value) - Number(left.sitelinks.value));
const existingNames = new Set([...reserved, ...curated].map((figure) => figure.displayName.toLowerCase()));
const existingIds = new Set([...reserved, ...curated].map((figure) => figure.id));
const candidates = [];

for (const row of rows) {
  const displayName = row.personLabel?.value;
  const childrenCount = Number(row.children?.value);
  if (!displayName || /^Q\d+$/.test(displayName) || existingNames.has(displayName.toLowerCase()) || !Number.isInteger(childrenCount)) continue;
  const baseId = slug(displayName);
  const id = existingIds.has(baseId) ? `${baseId}-${row.person.value.split("/").pop().toLowerCase()}` : baseId;
  if (existingIds.has(id)) continue;
  existingIds.add(id);
  existingNames.add(displayName.toLowerCase());
  candidates.push({ id, displayName, childrenCount, row });
  if (candidates.length === 100 - curated.length) break;
}
if (curated.length + candidates.length < 100) throw new Error(`Only found ${curated.length + candidates.length} usable figures.`);

const wikipediaTitles = curated.map((figure) => decodeURIComponent(new URL(figure.sources[0].url).pathname.slice(6)).replaceAll("_", " "));
const pageImagesResponse = await fetch(`https://en.wikipedia.org/w/api.php?${new URLSearchParams({ action: "query", format: "json", formatversion: "2", prop: "pageimages", piprop: "name", titles: wikipediaTitles.join("|") })}`, { headers });
if (!pageImagesResponse.ok) throw new Error(`Wikipedia request failed: ${pageImagesResponse.status}`);
const pageImages = new Map((await pageImagesResponse.json()).query.pages.map((page) => [page.title, page.pageimage]));
const fileById = new Map(curated.map((figure, index) => [figure.id, pageImages.get(wikipediaTitles[index])]));
for (const candidate of candidates) fileById.set(candidate.id, decodeURIComponent(new URL(candidate.row.image.value).pathname.split("/").pop()));

const files = [...new Set(fileById.values())].filter(Boolean);
const metadata = new Map();
for (let index = 0; index < files.length; index += 40) {
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${new URLSearchParams({ action: "query", format: "json", formatversion: "2", prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "480", titles: files.slice(index, index + 40).map((file) => `File:${file}`).join("|") })}`, { headers });
  if (!response.ok) throw new Error(`Wikimedia Commons request failed: ${response.status}`);
  for (const page of (await response.json()).query.pages) metadata.set(page.title.replace(/^File:/, "").replaceAll(" ", "_"), page.imageinfo?.[0]);
}

function imageFor(id, displayName) {
  const file = fileById.get(id);
  const info = metadata.get(file?.replaceAll(" ", "_"));
  if (!info?.thumburl || !info?.descriptionurl || !info?.extmetadata?.LicenseShortName?.value) throw new Error(`Missing reusable portrait for ${displayName}`);
  return { url: info.thumburl, alt: `Portrait of ${displayName}`, licence: info.extmetadata.LicenseShortName.value, attribution: plainText(info.extmetadata?.Artist?.value ?? "Wikimedia Commons contributor"), sourceUrl: info.descriptionurl };
}

for (const figure of curated) figure.image = imageFor(figure.id, figure.displayName);
const generated = candidates.map(({ id, displayName, childrenCount, row }) => {
  const description = row.personDescription?.value ?? "Public figure";
  const lower = description.toLowerCase();
  const tags = lower.includes("singer") || lower.includes("musician") ? ["music"] : lower.includes("actor") || lower.includes("film") ? ["film"] : lower.includes("football") || lower.includes("athlete") || lower.includes("boxer") ? ["sport"] : lower.includes("president") || lower.includes("politician") ? ["politics"] : lower.includes("writer") || lower.includes("author") ? ["literature"] : lower.includes("scientist") || lower.includes("physicist") ? ["science"] : ["public-figure"];
  return {
    id, displayName, descriptor: description.replace(/\s*\([^)]*\)\s*$/, ""), category: "modern-celebrities", tags, childrenCount,
    countType: "commonly-recorded", countingRuleSummary: `${childrenCount} ${childrenCount === 1 ? "child is" : "children are"} recorded by Wikidata.`,
    explanation: `${displayName} ${childrenCount === 1 ? "has" : "has"} ${childrenCount} ${childrenCount === 1 ? "child" : "children"} in the cited records.`,
    confidence: "medium", recognisabilityScore: Number(row.sitelinks.value) >= 200 ? 5 : Number(row.sitelinks.value) >= 140 ? 4 : 3, status: "active",
    image: imageFor(id, displayName),
    sources: [
      { title: `Wikipedia — ${displayName}`, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(row.articleTitle.value.replaceAll(" ", "_"))}` },
      { title: `Wikidata — ${displayName}`, url: row.person.value.replace("http://", "https://") },
    ],
  };
});

await writeFile(target, `${JSON.stringify([...curated, ...generated], null, 2)}\n`);
console.log(`Seeded ${curated.length + generated.length} Modern Celebrities.`);
