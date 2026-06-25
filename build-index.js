#!/usr/bin/env node
"use strict";
// Build rules/index.json:
//   { pageCount, pages:[{p, t}], terms:[{k, pages:[{p,c}]}] }
// - pages[].t : plain text of that page (drives full-text search + snippets in the app)
// - terms[]   : curated game-keyword -> best pages, by occurrence count
//
// The keyword LIST below is factual game vocabulary (term names only). The page
// numbers are computed from the user's own PDF; no rulebook prose is authored here.
const { execFileSync } = require("child_process");

const PDF = process.argv[2];
const N = parseInt(process.argv[3], 10);

// one pdftotext pass; pages are form-feed (\f) separated
const raw = execFileSync("pdftotext", ["-layout", PDF, "-"], { maxBuffer: 1 << 29 }).toString();
let parts = raw.split("\f");
while (parts.length && parts[parts.length - 1].trim() === "") parts.pop();
if (parts.length !== N) process.stderr.write(`warn: split ${parts.length} != pages ${N}\n`);

// normalize whitespace, keep it compact
const pages = parts.map((t, i) => ({
  p: i + 1,
  t: t.replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n").trim()
}));

// curated keywords — Frosthaven/Gloomhaven game-term names (labels, not prose)
const KEYWORDS = [
  // statuses
  "poison", "wound", "muddle", "immobilize", "disarm", "stun", "strengthen",
  "regenerate", "ward", "brittle", "bane", "impair", "chill", "infect",
  "invisible", "curse", "bless", "rupture", "dodge",
  // combat keywords
  "pierce", "push", "pull", "target", "heal", "shield", "retaliate", "loot",
  "advantage", "disadvantage", "attack modifier", "rolling", "fly", "jump",
  "teleport", "range", "area of effect", "line of sight",
  // elements
  "fire", "ice", "air", "earth", "light", "dark", "element", "infuse", "consume",
  // turn / round structure
  "initiative", "long rest", "short rest", "exhaustion", "exhausted", "recover",
  "refresh", "active bonus", "persistent bonus", "round", "turn", "focus",
  // map / terrain
  "difficult terrain", "hazardous terrain", "obstacle", "trap", "door", "hex",
  "corridor", "overlay tile",
  // monsters
  "elite", "boss", "summon", "ally", "monster ability card", "monster focus",
  // campaign
  "scenario", "campaign", "level up", "experience", "gold", "reputation",
  "prosperity", "outpost", "building", "morale", "resource", "crafting",
  "loot deck", "battle goal", "personal quest", "retirement", "town guard",
  "frosthaven event", "section book", "sticker", "inspiration", "trial",
  // items / abilities
  "item", "equip", "spent", "consumed", "lost", "permanent", "augment",
  "minion", "pressure point", "challenge card", "random scenario"
];

function countOccurrences(text, term) {
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // word-ish boundary; allow phrases with spaces
  const re = new RegExp("(?:^|[^a-z])" + esc + "(?:[^a-z]|$)", "gi");
  let n = 0; while (re.exec(text) !== null) n++;
  return n;
}

const lowered = pages.map(pg => pg.t.toLowerCase());
const terms = [];
for (const k of KEYWORDS) {
  const hits = [];
  for (let i = 0; i < lowered.length; i++) {
    const c = countOccurrences(lowered[i], k);
    if (c > 0) hits.push({ p: i + 1, c });
  }
  if (!hits.length) continue;
  hits.sort((a, b) => b.c - a.c || a.p - b.p);
  terms.push({ k, pages: hits.slice(0, 4) }); // top pages for this term
}

process.stdout.write(JSON.stringify({ pageCount: N, pages, terms }));
