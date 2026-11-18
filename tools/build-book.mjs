#!/usr/bin/env node
// Turns a Project Gutenberg plain-text book into the chapter JSON the app reads.
// Usage: node tools/build-book.mjs <gutenberg.txt> <book-id> "<Title>" "<Author>" > books/<book-id>.json
import { readFileSync } from 'node:fs';

const [, , src, id, title, author] = process.argv;
if (!src || !id || !title || !author) {
  console.error('Usage: build-book.mjs <gutenberg.txt> <book-id> "<Title>" "<Author>"');
  process.exit(1);
}

// Wording we change for a young modern reader. Keep this list short and visible.
const REPLACEMENTS = [
  [/pickaninnies/g, 'ones'], // racial slur in the 1913 text
  [/Une' Billy/g, "Unc' Billy"], // scanning typo
  [/''/g, '”'],
];

let lines = readFileSync(src, 'utf8').replace(/\r/g, '').split('\n');
const start = lines.findIndex((l) => l.startsWith('*** START OF'));
let end = lines.findIndex((l) => l.startsWith('*** END OF'));
lines = lines.slice(start + 1, end);
end = lines.findIndex((l) => /^End of (the )?Project Gutenberg/i.test(l));
if (end !== -1) lines = lines.slice(0, end);

const isBlank = (i) => i < 0 || i >= lines.length || lines[i].trim() === '';
const HEADING = /^([IVXL]+)\.? +(\S.*)$/;

const chapters = [];
let current = null;
let para = [];

function flush() {
  if (!para.length || !current) {
    para = [];
    return;
  }
  const verse = para.length > 1 && para.every((l) => /^ {4,}/.test(l));
  let text = verse
    ? para.map((l) => l.trim()).join('\n')
    : para.map((l) => l.trim()).join(' ').replace(/ {2,}/g, ' ');
  text = text.replace(/--/g, '—');
  for (const [from, to] of REPLACEMENTS) text = text.replace(from, to);
  current.paragraphs.push(verse ? { verse: text } : text);
  para = [];
}

lines.forEach((line, i) => {
  const m = line.match(HEADING);
  if (m && isBlank(i - 1) && isBlank(i - 2) && isBlank(i - 3) && isBlank(i + 1)) {
    flush();
    current = { number: chapters.length + 1, title: m[2].trim(), paragraphs: [] };
    chapters.push(current);
    return;
  }
  if (line.trim() === '') flush();
  else para.push(line);
});
flush();

process.stdout.write(JSON.stringify({ id, title, author, chapters }, null, 1) + '\n');
console.error(`${chapters.length} chapters`);
