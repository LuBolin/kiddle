import { readFile, writeFile } from "node:fs/promises";

const endpoint = "https://query.wikidata.org/sparql";
const headers = { "User-Agent": "Kiddle East Asian history curation (development)" };
const prefix = "PREFIX wdt: <http://www.wikidata.org/prop/direct/> PREFIX wikibase: <http://wikiba.se/ontology#> PREFIX schema: <http://schema.org/> PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>";
const slug = (value) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const plainText = (value) => value.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const fallbackZh = { "Na Hye-sok": "韩国作家兼画家", "Batu Khan": "金帐汗国建立者", "Ögedei Khan": "蒙古帝国第二任大汗", "Jochi": "成吉思汗长子", "Hoelun": "成吉思汗之母", "Nguyễn Huệ": "越南皇帝", "Gia Long": "越南阮朝开国皇帝", "Minh Mạng": "越南阮朝皇帝", "Shi Le": "后赵开国皇帝" };

const japanIds = new Set([
  "east-asian-history-katsushika-hokusai", "east-asian-history-murasaki-shikibu", "east-asian-history-emperor-meiji", "east-asian-history-hideki-tojo", "east-asian-history-tokugawa-ieyasu",
  "east-asian-history-oda-nobunaga", "east-asian-history-toyotomi-hideyoshi", "east-asian-history-ito-hirobumi", "east-asian-history-natsume-soseki", "east-asian-history-sei-shonagon",
  "east-asian-history-jimmu", "east-asian-history-kano-jigoro", "east-asian-history-fukuzawa-yukichi", "east-asian-history-saigo-takamori", "east-asian-history-togo-heihachiro",
  "east-asian-history-minamoto-no-yoritomo", "east-asian-history-prince-shotoku", "east-asian-history-tokugawa-yoshinobu", "east-asian-history-takeda-shingen", "east-asian-history-date-masamune",
  "east-asian-history-fujiwara-no-teika", "east-asian-history-minamoto-no-yoshitsune", "east-asian-history-akechi-mitsuhide", "east-asian-history-tokugawa-iemitsu", "east-asian-history-tokugawa-yoshimune",
]);
const japanThemes = {
  "japanese-classics": ["east-asian-history-katsushika-hokusai", "east-asian-history-murasaki-shikibu", "east-asian-history-natsume-soseki", "east-asian-history-sei-shonagon", "east-asian-history-fujiwara-no-teika"],
  "sengoku-japan": ["east-asian-history-tokugawa-ieyasu", "east-asian-history-oda-nobunaga", "east-asian-history-toyotomi-hideyoshi", "east-asian-history-takeda-shingen", "east-asian-history-date-masamune", "east-asian-history-akechi-mitsuhide"],
  "tokugawa-meiji": ["east-asian-history-emperor-meiji", "east-asian-history-ito-hirobumi", "east-asian-history-fukuzawa-yukichi", "east-asian-history-saigo-takamori", "east-asian-history-togo-heihachiro", "east-asian-history-tokugawa-yoshinobu", "east-asian-history-tokugawa-iemitsu", "east-asian-history-tokugawa-yoshimune"],
  "early-japan": ["east-asian-history-jimmu", "east-asian-history-minamoto-no-yoritomo", "east-asian-history-prince-shotoku", "east-asian-history-minamoto-no-yoshitsune"],
  "modern-japan": ["east-asian-history-hideki-tojo", "east-asian-history-kano-jigoro"],
};

const groups = {
  "chinese-classics": ["Confucius", "Laozi", "Sima Qian", "Li Bai", "Du Fu", "Su Shi", "Zhu Xi", "Wang Anshi", "Yue Fei", "Qi Baishi", "Lao She", "Ba Jin", "Guo Moruo"],
  "three-kingdoms": ["Cao Cao", "Liu Bei", "Sun Quan", "Sima Yi", "Sima Zhao", "Zhuge Liang"],
  "republic-prc": ["Sun Yat-sen", "Chiang Kai-shek", "Mao Zedong", "Deng Xiaoping", "Liu Shaoqi", "Lin Biao", "Zhu De", "Jiang Zemin", "Hu Jintao", "Zhao Ziyang", "Li Peng", "Hu Yaobang", "He Long", "Chen Yi", "Yuan Longping", "Zhou Youguang"],
  "korean-history": ["Sejong the Great", "Kim Ku", "Syngman Rhee", "Park Chung-hee", "Kim Dae-jung", "Roh Moo-hyun", "Moon Jae-in", "Lee Byung-chul", "Jeong Ju-yung", "Na Hye-sok", "Kim Seong-su"],
  "mongol-empire": ["Genghis Khan", "Ögedei Khan", "Jochi", "Batu Khan", "Hoelun"],
  "vietnamese-history": ["Nguyễn Huệ", "Gia Long", "Minh Mạng"],
};
const excludedEmperors = new Set(["Yuan Shu", "Hong Xiuquan", "Emperor Ku", "Zhuanxu", "King Cheng of Zhou", "King Mu of Zhou", "King Kang of Zhou", "King Zhao of Zhou", "Li Yu", "Wu"]);

async function wikidata(query) {
  const response = await fetch(`${endpoint}?${new URLSearchParams({ query, format: "json" })}`, { headers });
  if (!response.ok) throw new Error(`Wikidata query failed: ${response.status}`);
  return (await response.json()).results.bindings;
}

async function detailsFor(ids) {
  const details = [];
  for (let index = 0; index < ids.length; index += 25) {
    details.push(...await wikidata(`${prefix} SELECT ?person ?en ?zh ?description ?descriptionZh ?image ?articleTitle ?sitelinks (COUNT(DISTINCT ?child) AS ?children) WHERE {
      VALUES ?person { ${ids.slice(index, index + 25).map((id) => `<${id}>`).join(" ")} }
      ?person wdt:P40 ?child; wdt:P18 ?image; wikibase:sitelinks ?sitelinks; rdfs:label ?en. FILTER(LANG(?en) = "en")
      OPTIONAL { ?person rdfs:label ?zh. FILTER(LANG(?zh) = "zh") }
      OPTIONAL { ?person schema:description ?description. FILTER(LANG(?description) = "en") }
      OPTIONAL { ?person schema:description ?descriptionZh. FILTER(LANG(?descriptionZh) = "zh") }
      OPTIONAL { ?article schema:about ?person; schema:isPartOf <https://en.wikipedia.org/>; schema:name ?articleTitle. }
    } GROUP BY ?person ?en ?zh ?description ?descriptionZh ?image ?articleTitle ?sitelinks`));
  }
  return details;
}

const names = Object.values(groups).flat();
const values = names.map((name) => `${JSON.stringify(name)}@en`).join(" ");
const selectedRows = await wikidata(`${prefix} SELECT ?person ?en ?zh ?description ?descriptionZh ?image ?articleTitle ?sitelinks (COUNT(DISTINCT ?child) AS ?children) WHERE {
  VALUES ?en { ${values} }
  ?person rdfs:label ?en; wdt:P40 ?child; wdt:P18 ?image; wikibase:sitelinks ?sitelinks.
  OPTIONAL { ?person rdfs:label ?zh. FILTER(LANG(?zh) = "zh") }
  OPTIONAL { ?person schema:description ?description. FILTER(LANG(?description) = "en") }
  OPTIONAL { ?person schema:description ?descriptionZh. FILTER(LANG(?descriptionZh) = "zh") }
  OPTIONAL { ?article schema:about ?person; schema:isPartOf <https://en.wikipedia.org/>; schema:name ?articleTitle. }
} GROUP BY ?person ?en ?zh ?description ?descriptionZh ?image ?articleTitle ?sitelinks`);
const selectedByName = new Map(selectedRows.map((row) => [row.en.value, row]));
const missing = names.filter((name) => !selectedByName.has(name));
if (missing.length) throw new Error(`Missing source-backed records: ${missing.join(", ")}`);

const emperorSummary = await wikidata(`${prefix} SELECT ?person ?en ?sitelinks (COUNT(DISTINCT ?child) AS ?children) WHERE {
  ?person wdt:P39 ?position; wdt:P40 ?child; wdt:P18 ?image; wikibase:sitelinks ?sitelinks.
  ?position wdt:P279* <http://www.wikidata.org/entity/Q268218>.
  ?person rdfs:label ?en. FILTER(LANG(?en) = "en")
  FILTER(?sitelinks >= 35)
} GROUP BY ?person ?en ?sitelinks ORDER BY DESC(?sitelinks)`);
const emperorRows = await detailsFor(emperorSummary.filter((row) => !excludedEmperors.has(row.en.value)).map((row) => row.person.value));

const rowsById = new Map();
for (const row of [...selectedRows, ...emperorRows]) rowsById.set(row.person.value, row);
const rows = [...rowsById.values()];
const manualFigures = [{
  id: "east-asian-history-yi-sun-sin-q50184", category: "east-asian-history", tags: ["korean-history", "korea"], childrenCount: 4,
  countType: "commonly-recorded", confidence: "medium", recognisabilityScore: 5, status: "active",
  imageFile: "Bust of Yi Sun-sin 01.jpg", imageSource: "https://www.wikidata.org/wiki/Q50184",
  sources: [
    { title: "Korean Spirit & Culture Promotion Project — Admiral Yi Sun-sin", url: "https://fromthemixedupfiles.com/wp-content/uploads/2020/12/Admiral-Yi-Sunsin_KSCPP1.pdf" },
    { title: "Wikidata — Yi Sun-sin", url: "https://www.wikidata.org/wiki/Q50184" },
  ],
  text: {
    en: { displayName: "Yi Sun-sin", descriptor: "Korean naval commander", countingRuleSummary: "4 children are recorded in the cited biographical material.", explanation: "Yi Sun-sin is recorded as having three sons and one daughter.", imageAlt: "Bust of Yi Sun-sin" },
    zh: { displayName: "李舜臣", descriptor: "朝鲜水军统帅", countingRuleSummary: "引用的传记资料记录其有4名子女。", explanation: "李舜臣被记录育有三子一女。", imageAlt: "李舜臣半身像" },
  },
}];
const files = [...new Set([...rows.map((row) => decodeURIComponent(new URL(row.image.value).pathname.split("/").pop())), ...manualFigures.map((figure) => figure.imageFile)])];
const commons = new Map();
for (let index = 0; index < files.length; index += 40) {
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${new URLSearchParams({ action: "query", format: "json", formatversion: "2", prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "480", titles: files.slice(index, index + 40).map((file) => `File:${file}`).join("|") })}`, { headers });
  if (!response.ok) throw new Error(`Wikimedia Commons query failed: ${response.status}`);
  for (const page of (await response.json()).query.pages) commons.set(page.title.replace(/^File:/, "").replaceAll(" ", "_"), page.imageinfo?.[0]);
}

const stored = JSON.parse(await readFile(new URL("../src/data/east-asian-history.json", import.meta.url), "utf8"));
const japan = stored.filter((figure) => japanIds.has(figure.id)).map((figure) => {
  const theme = Object.entries(japanThemes).find(([, ids]) => ids.includes(figure.id))?.[0];
  return { ...figure, tags: [...new Set([...figure.tags, "japan", theme])] };
});
if (japan.length !== japanIds.size) throw new Error("A selected Japanese record is missing from the current data.");
const generated = rows.map((row) => {
  const displayName = row.en.value;
  const file = decodeURIComponent(new URL(row.image.value).pathname.split("/").pop()).replaceAll(" ", "_");
  const image = commons.get(file);
  if (!image?.thumburl || !image.descriptionurl || !image.extmetadata?.LicenseShortName?.value) throw new Error(`Missing reusable portrait metadata for ${displayName}`);
  const story = Object.entries(groups).find(([, values]) => values.includes(displayName))?.[0] ?? "chinese-emperors";
  const region = story === "korean-history" ? "korea" : story === "mongol-empire" ? "mongolia" : story === "vietnamese-history" ? "vietnam" : "china";
  const childrenCount = Number(row.children.value);
  const chineseName = row.zh?.value ?? displayName;
  const descriptor = row.description?.value ?? "East Asian historical figure";
  const chineseDescriptor = fallbackZh[displayName] ?? row.descriptionZh?.value ?? descriptor;
  return {
    id: `east-asian-history-${slug(displayName)}-${row.person.value.split("/").pop().toLowerCase()}`,
    category: "east-asian-history", tags: [story, region], childrenCount, countType: "commonly-recorded", confidence: "medium",
    recognisabilityScore: Number(row.sitelinks.value) >= 100 ? 5 : Number(row.sitelinks.value) >= 40 ? 4 : 3, status: "active",
    image: { url: image.thumburl, licence: image.extmetadata.LicenseShortName.value, attribution: plainText(image.extmetadata.Artist?.value ?? "Wikimedia Commons contributor"), sourceUrl: image.descriptionurl },
    sources: [...(row.articleTitle ? [{ title: `Wikipedia — ${displayName}`, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(row.articleTitle.value.replaceAll(" ", "_"))}` }] : []), { title: `Wikidata — ${displayName}`, url: row.person.value.replace("http://", "https://") }],
    text: {
      en: { displayName, descriptor, countingRuleSummary: `${childrenCount} ${childrenCount === 1 ? "child is" : "children are"} recorded by Wikidata.`, explanation: `${displayName} has ${childrenCount} ${childrenCount === 1 ? "child" : "children"} in the cited records.`, imageAlt: `Portrait of ${displayName}` },
      zh: { displayName: chineseName, descriptor: chineseDescriptor, countingRuleSummary: `${childrenCount} 名子女记录于维基数据。`, explanation: `引用的记录显示${chineseName}有${childrenCount}名子女。`, imageAlt: `${chineseName}肖像` },
    },
  };
});

const manual = manualFigures.map(({ imageFile, imageSource, ...figure }) => {
  const image = commons.get(imageFile.replaceAll(" ", "_"));
  if (!image?.thumburl || !image.descriptionurl || !image.extmetadata?.LicenseShortName?.value) throw new Error(`Missing reusable portrait metadata for ${figure.text.en.displayName}`);
  return {
    ...figure,
    image: { url: image.thumburl, licence: image.extmetadata.LicenseShortName.value, attribution: plainText(image.extmetadata.Artist?.value ?? "Wikimedia Commons contributor"), sourceUrl: image.descriptionurl },
  };
});

await writeFile(new URL("../src/data/east-asian-history.json", import.meta.url), `${JSON.stringify([...japan, ...generated, ...manual], null, 2)}\n`);
console.log(`Rebalanced East Asian History: ${generated.filter((figure) => figure.tags.includes("china")).length} China, ${japan.length} Japan, ${[...generated, ...manual].filter((figure) => figure.tags.includes("korea")).length} Korea, ${generated.filter((figure) => figure.tags.includes("mongolia")).length} Mongolia, ${generated.filter((figure) => figure.tags.includes("vietnam")).length} Vietnam.`);
