// post-x entry: the program hands the post in. It copies POST.json (the X post's
// address, written by the agent that made the video) from the repository root to
// /output/POST.json, where the gate reads it. Nothing else is written, and the
// two runs of an entry write the same bytes: a plain copy, no network, no clock,
// no files outside the repository.
//
// Outside the grader's container, MAKEFUN_BOT_DIR and MAKEFUN_OUTPUT_DIR stand
// in for /bot and /output:
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const source = join(BOT_DIR, 'POST.json');
const target = join(OUTPUT_DIR, 'POST.json');

// The gate refuses a POST.json it cannot parse, so fail loudly here instead of
// handing it a broken copy. The placeholder address is still a string, so this
// passes until the real post's address replaces it.
const text = readFileSync(source, 'utf8');
const parsed = JSON.parse(text) as unknown;
if (
  parsed === null ||
  typeof parsed !== 'object' ||
  Array.isArray(parsed) ||
  typeof (parsed as Record<string, unknown>).url !== 'string'
) {
  console.error('POST.json must be a JSON object with a string url field');
  process.exit(1);
}

mkdirSync(OUTPUT_DIR, { recursive: true });
copyFileSync(source, target);
