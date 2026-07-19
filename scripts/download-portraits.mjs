import { readFile, writeFile } from "node:fs/promises";

const titles = {
  "queen-victoria": "Queen Victoria",
  "george-iii": "George III",
  "elizabeth-ii": "Elizabeth II",
  "george-v": "George V",
  "george-vi": "George VI",
  "charles-i": "Charles I of England",
  "james-i": "James VI and I",
  "mary-queen-of-scots": "Mary, Queen of Scots",
  "elizabeth-i": "Elizabeth I",
  "william-shakespeare": "William Shakespeare",
  "charles-dickens": "Charles Dickens",
  "charles-darwin": "Charles Darwin",
  "jane-austen": "Jane Austen",
  "isaac-newton": "Isaac Newton",
  "marie-curie": "Marie Curie",
  "florence-nightingale": "Florence Nightingale",
  "winston-churchill": "Winston Churchill",
  "george-washington": "George Washington",
  "john-adams": "John Adams",
  "abraham-lincoln": "Abraham Lincoln",
  "theodore-roosevelt": "Theodore Roosevelt",
  "franklin-roosevelt": "Franklin D. Roosevelt",
  "ulysses-grant": "Ulysses S. Grant",
  "alexander-hamilton": "Alexander Hamilton",
  "benjamin-franklin": "Benjamin Franklin",
  "johann-bach": "Johann Sebastian Bach",
  "william-the-conqueror": "William the Conqueror",
  "mary-antoinette": "Marie Antoinette",
  "thomas-jefferson": "Thomas Jefferson",
  "napoleon-iii": "Napoleon III",
  "louis-xiv": "Louis XIV",
};
const tags = {
  "queen-victoria": ["british-monarchy", "royalty"],
  "george-iii": ["british-monarchy", "royalty"],
  "elizabeth-ii": ["british-monarchy", "royalty"],
  "george-v": ["british-monarchy", "royalty"],
  "george-vi": ["british-monarchy", "royalty"],
  "charles-i": ["british-monarchy", "royalty"],
  "james-i": ["british-monarchy", "royalty"],
  "mary-queen-of-scots": ["scottish-monarchy", "royalty"],
  "elizabeth-i": ["british-monarchy", "royalty"],
  "william-shakespeare": ["writer", "english-literature"],
  "charles-dickens": ["writer", "english-literature"],
  "charles-darwin": ["scientist", "natural-history"],
  "jane-austen": ["writer", "english-literature"],
  "isaac-newton": ["scientist", "physics"],
  "marie-curie": ["scientist", "nobel-laureate"],
  "florence-nightingale": ["nursing", "social-reformer"],
  "winston-churchill": ["british-politics", "prime-minister"],
  "george-washington": ["us-president", "american-founder"],
  "john-adams": ["us-president", "american-founder"],
  "abraham-lincoln": ["us-president", "american-civil-war"],
  "theodore-roosevelt": ["us-president", "progressive-era"],
  "franklin-roosevelt": ["us-president", "world-war-ii"],
  "ulysses-grant": ["us-president", "american-civil-war"],
  "alexander-hamilton": ["american-founder", "statesman"],
  "benjamin-franklin": ["american-founder", "inventor"],
  "johann-bach": ["composer", "baroque"],
  "william-the-conqueror": ["english-monarchy", "norman"],
  "mary-antoinette": ["french-monarchy", "royalty"],
  "thomas-jefferson": ["us-president", "american-founder"],
  "napoleon-iii": ["french-monarchy", "bonapartist"],
  "louis-xiv": ["french-monarchy", "royalty"],
};

const wikipedia = "https://en.wikipedia.org/w/api.php";
const commons = "https://commons.wikimedia.org/w/api.php";
const headers = { "User-Agent": "Kiddle local content importer (development)" };
const plainText = (value) => value
  .replace(/<[^>]*>/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&nbsp;/g, " ")
  .replace(/\s+/g, " ")
  .trim();
const query = async (base, parameters) => {
  const response = await fetch(`${base}?${new URLSearchParams({ action: "query", format: "json", formatversion: "2", ...parameters })}`, { headers });
  if (!response.ok) throw new Error(`Wikimedia request failed: ${response.status}`);
  return response.json();
};

const pageData = await query(wikipedia, {
  prop: "pageimages",
  piprop: "name",
  titles: Object.values(titles).join("|"),
});
const imageByTitle = new Map(pageData.query.pages.map((page) => [page.title, page.pageimage]));
const fileNames = Object.values(titles).map((title) => imageByTitle.get(title)).filter(Boolean);
const commonsData = await query(commons, {
  prop: "imageinfo",
  iiprop: "url|extmetadata",
  iiurlwidth: "480",
  titles: fileNames.map((fileName) => `File:${fileName}`).join("|"),
});
const imageByFile = new Map(commonsData.query.pages.map((page) => [page.title.replace(/^File:/, "").replaceAll(" ", "_"), page.imageinfo?.[0]]));

const figures = JSON.parse(await readFile(new URL("../src/data/western-history.json", import.meta.url), "utf8"));
const figureById = new Map(figures.map((figure) => [figure.id, figure]));

for (const [id, title] of Object.entries(titles)) {
  const fileName = imageByTitle.get(title);
  const image = imageByFile.get(fileName);
  const thumbnailUrl = image?.thumburl;
  const license = image?.extmetadata?.LicenseShortName?.value;
  if (!fileName || !thumbnailUrl || !license) throw new Error(`Missing reusable Wikimedia portrait metadata for ${title}`);

  const figure = figureById.get(id);
  if (!figure) throw new Error(`Unknown Figure id: ${id}`);
  figure.tags ??= tags[id] ?? [];
  figure.image = {
    url: thumbnailUrl,
    sourceUrl: image.descriptionurl,
    licence: license,
    attribution: plainText(image.extmetadata?.Artist?.value ?? "Wikimedia Commons contributor"),
  };
}

await writeFile(new URL("../src/data/western-history.json", import.meta.url), `${JSON.stringify(figures, null, 2)}\n`);
console.log(`Synced ${Object.keys(titles).length} Figure image records.`);
