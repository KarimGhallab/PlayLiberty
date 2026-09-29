/*
 * Splices the morph's CSS block into every file that uses the control, from the
 * generator and never retyped.
 *
 * A script is the right tool for one reason: the block is emitted text, and hand
 * copies of an emitted block are chances to drift from it. The anchor is the
 * comment that opens the block, which the generator writes, and the block ends at
 * the closing brace of the keyframes, which the same regex the verifier uses also
 * finds. So the search and the verification agree by construction, and a file
 * whose block is stale simply is not found and the run fails.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { styleBlock } from './morph-frames.mjs';

const designDir = fileURLToPath(new URL('..', import.meta.url));
const BLOCK = styleBlock();

/* The same shape the verifier matches: the opening comment through the keyframes
   closing brace. */
const BLOCK_RE =
  /\/\* The strip\.[\s\S]*?@keyframes pl-play-pause \{[\s\S]*?\n {6}\}/;

/* The prototype's hand-written block opens with a different comment, so it is
   matched by its own opening rule and swapped for the emitted one. */
const HAND_RE =
  /\/\* Play to pause\.[\s\S]*?@keyframes pl-play-pause \{[\s\S]*?\n {6}\}/;

/*
 * The targets are discovered, not listed.
 *
 * A hardcoded list of the files that use this control goes stale the moment a
 * component adopts it, and it fails the way check 2l's host list did: the new
 * file is simply absent, the run is clean, and the block in it is a hand copy.
 * So the files are found the way the validator finds them, by the data-morph the
 * block drives, which is what makes a file a user of this control at all.
 */
const files = [];
for (const dir of ['components', 'foundations', 'screens']) {
  const full = path.join(designDir, dir);
  if (!existsSync(full)) {
    continue;
  }
  for (const name of readdirSync(full).sort()) {
    if (!name.endsWith('.html')) {
      continue;
    }
    const file = path.join(full, name);
    if (readFileSync(file, 'utf8').includes('data-morph=')) {
      files.push(path.join(dir, name));
    }
  }
}

if (!files.length) {
  throw new Error(
    'no specimen declares a morph, so there is nothing to splice'
  );
}

/* Every occurrence, not the first. The superseded transport prototype carries the
   block twice, which is a blemish rather than a decision, and splicing only the
   first would leave the second stale and invisible: the verifier reads the first
   match, so a file can pass with a dead copy of the block still in it. */
const occurrences = (html, re) => {
  const found = [];
  for (const m of html.matchAll(new RegExp(re.source, 'g'))) {
    found.push(m[0]);
  }
  return found;
};

try {
  for (const rel of files) {
    const file = path.join(designDir, rel);
    const html = readFileSync(file, 'utf8');
    const emitted = occurrences(html, BLOCK_RE);
    const hand = emitted.length ? [] : occurrences(html, HAND_RE);

    if (!emitted.length && !hand.length) {
      throw new Error(`${rel}: no morph block found to replace`);
    }
    if (emitted.length > 1 || hand.length > 1) {
      console.log(
        `${rel} carried ${emitted.length + hand.length} copies, all replaced`
      );
    }

    const out = html.replace(emitted.length ? BLOCK_RE : HAND_RE, () => BLOCK);
    writeFileSync(file, out);
    console.log(`spliced ${rel}`);
  }
} finally {
  /* Nothing to restore on the happy path: the emitted block is what should be
     there, and a file is written once, whole, after its own read. A run killed
     between two files leaves the earlier ones correct and the later ones
     untouched, which is why the per-file log rather than a single summary is
     what a reader checks. */
}
