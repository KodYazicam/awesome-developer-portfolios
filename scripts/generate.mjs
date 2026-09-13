#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function parseYamlList(text) {
  const items = [];
  let current = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("- ")) {
      if (current) items.push(current);
      current = {};
      const first = line.slice(2);
      const [k, ...rest] = first.split(":");
      current[k.trim()] = coerce(rest.join(":").trim());
      continue;
    }
    if (!current) continue;
    const m = line.match(/^\s+([A-Za-z]+):\s*(.*)$/);
    if (!m) continue;
    current[m[1]] = coerce(m[2]);
  }
  if (current) items.push(current);
  return items;
}

function coerce(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

const items = parseYamlList(readFileSync(join(root, "data/portfolios.yml"), "utf8"));
const seen = new Set();
const unique = [];
for (const item of items) {
  if (!item.url || seen.has(item.url)) continue;
  seen.add(item.url);
  unique.push(item);
}
unique.sort((a, b) => String(a.name).localeCompare(String(b.name)));

const table = [
  "| Site | Developer | Stack | Open source |",
  "| --- | --- | --- | :---: |",
  ...unique.map((p) => {
    const site = `[${p.name}](${p.url})`;
    const oss = p.openSource && p.github ? `[🔓](${p.github})` : "❌";
    return `| ${site} | ${p.developer || ""} | ${p.stack || p.style || ""} | ${oss} |`;
  }),
].join("\n");

const readme = readFileSync(join(root, "README.md"), "utf8");
const start = "<!-- UNIQUE:START -->";
const end = "<!-- UNIQUE:END -->";
const block = `${start}\n## Unique sites (${unique.length})\n\nSame URL listed once. Categories above may repeat a site.\n\n${table}\n${end}`;
let next;
if (readme.includes(start) && readme.includes(end)) {
  next = readme.replace(new RegExp(`${start}[\\s\\S]*?${end}`), block);
} else {
  next = `${readme.trimEnd()}\n\n${block}\n`;
}
writeFileSync(join(root, "README.md"), next);
console.log(`unique sites: ${unique.length}`);
