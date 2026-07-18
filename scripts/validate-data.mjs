import { readdir, readFile } from "node:fs/promises";

const dataDirectory = new URL("../src/data/", import.meta.url);
const dataFiles = (await readdir(dataDirectory)).filter((file) => file.endsWith(".json"));
const figures = (await Promise.all(dataFiles.map(async (file) => JSON.parse(await readFile(new URL(file, dataDirectory), "utf8"))))).flat();
const categories = new Set(["modern-celebrities", "east-asian-history", "east-asian-mythology", "western-history", "western-mythology"]);
const ids = new Set();
const errors = [];

for (const figure of figures) {
  if (!figure.id || ids.has(figure.id)) errors.push(`Duplicate or missing id: ${figure.id}`);
  ids.add(figure.id);
  if (!categories.has(figure.category)) errors.push(`${figure.id}: invalid category`);
  if (!Number.isInteger(figure.childrenCount) || figure.childrenCount < 0) errors.push(`${figure.id}: invalid child count`);
  if (figure.status === "active" && (!figure.sources?.length || !figure.image?.url || !figure.image?.sourceUrl || !figure.image?.licence || !figure.image?.attribution || !figure.explanation || !figure.countingRuleSummary)) errors.push(`${figure.id}: active record is incomplete`);
  if (!Array.isArray(figure.tags) || figure.tags.some((tag) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tag))) errors.push(`${figure.id}: invalid tags`);
  if (figure.status === "active" && figure.tags.length === 0) errors.push(`${figure.id}: active record needs a tag`);
  if (figure.status === "active" && !["high", "medium"].includes(figure.confidence)) errors.push(`${figure.id}: invalid confidence`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`Validated ${figures.filter((figure) => figure.status === "active").length} active figures in ${dataFiles.length} category file(s).`);
