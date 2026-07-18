import { readFile } from "node:fs/promises";

const figures = JSON.parse(await readFile(new URL("../src/data/western-history.json", import.meta.url), "utf8"));
const ids = new Set();
const errors = [];

for (const figure of figures) {
  if (!figure.id || ids.has(figure.id)) errors.push(`Duplicate or missing id: ${figure.id}`);
  ids.add(figure.id);
  if (figure.category !== "western-history") errors.push(`${figure.id}: invalid category`);
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
console.log(`Validated ${figures.filter((figure) => figure.status === "active").length} active Western History figures.`);
