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

import { stripBlock, styleBlock } from './morph-frames.mjs';

const designDir = fileURLToPath(new URL('..', import.meta.url));
const BLOCK = styleBlock();
const STRIP = stripBlock();

/* The same shape the verifier matches: the opening comment through the keyframes
   closing brace. */
const BLOCK_RE =
  /\/\* The strip\.[\s\S]*?@keyframes pl-play-pause \{[\s\S]*?\n {6}\}/;

/* The eight frame groups in the markup, which the generator emits and which were
   pasted by hand until the library needed thirteen of them in one file.

   The CSS block was spliced and the markup was not, so the geometry a control
   actually draws was the one thing in it that could drift: a designer could add a
   play button, paste the strip out of another specimen, and be a frame off with
   nothing to notice. The reasoning the CSS splice is built on applies to the
   paths as much, and the failure is worse there, because the wrapper makes it
   silent. A strip without its <g class="play__strip"> is addressed by no rule,
   sits at translateX(0) whatever the state says, and draws frame 0 forever, which
   on a playing button is the play triangle where the pause bars belong. Because
   .play__glyph clips, that looks exactly like a correct resting glyph rather than
   like a strip that is not working.

   The match is anchored on the two frame offsets that cannot appear anywhere
   else, the first at translate(-1.5 0) and the last at translate(168 0), and ends
   at the first closing group after the last one. A path element contains no
   closing group of its own, so that end is the eighth frame's and not an earlier
   one's. Every occurrence is replaced, because a file with thirteen buttons needs
   thirteen and replacing only the first would leave twelve hand copies that a
   reader cannot see and a check cannot count. */
const STRIP_RE =
  /<g transform="translate\(-1\.5 0\)">[\s\S]*?<g transform="translate\(168 0\)">[\s\S]*?\n\s*<\/g>/g;

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

    /* The strip in the markup, every occurrence. A file that declares a morph
       and carries no strip is not a file with nothing to draw, it is the silent
       fault the generator's own comment names, so it fails the run rather than
       passing on a button that will sit on frame 0 forever. */
    const strips = occurrences(html, STRIP_RE);
    if (!strips.length) {
      throw new Error(
        `${rel} declares a morph but carries no frame groups, so its play ` +
          `control would sit on frame 0 whatever the state says`
      );
    }

    const out = html
      .replace(emitted.length ? BLOCK_RE : HAND_RE, () => BLOCK)
      .replace(STRIP_RE, () => STRIP);
    writeFileSync(file, out);
    console.log(`spliced ${rel}: 1 block, ${strips.length} strip(s)`);
  }
} finally {
  /* Nothing to restore on the happy path: the emitted block is what should be
     there, and a file is written once, whole, after its own read. A run killed
     between two files leaves the earlier ones correct and the later ones
     untouched, which is why the per-file log rather than a single summary is
     what a reader checks. */
}
