#!/usr/bin/env node
/**
 * Prints the play to pause morph's markup and CSS, writes the frame table for
 * packages/tokens to transcribe, and verifies the specimen against the table.
 *
 * The specimen is hand-written HTML with no build step, so the frame data has to
 * sit in the file as literal markup. That is only safe because this script can
 * re-derive it and the design check runs that derivation on every commit: the
 * markup is pasted once and then held, and a hand edit to a frame is a gate
 * failure rather than a silent divergence.
 *
 * The comparison lives here rather than in the validator because the validator
 * is CommonJS and this module is ESM, and one dynamic import to bridge that is
 * not worth the shape it would put on the validator. The validator shells out.
 *
 *   node docs/design/scripts/build-morph-frames.mjs            print the blocks
 *   node docs/design/scripts/build-morph-frames.mjs --json     write the table
 *   node docs/design/scripts/build-morph-frames.mjs --verify f  check a specimen
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ENDPOINT_ICONS,
  MORPH,
  PINNED,
  PIN_VERSION,
  STRIP_TRAVEL,
  VERTEX_COUNT,
  buildFrames,
  frameJson,
  frameOffset,
  invariants,
  stripBlock,
  styleBlock
} from './morph-frames.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const designDir = path.resolve(here, '..');
const asJson = process.argv.indexOf('--json') !== -1;
const verifyAt = process.argv.indexOf('--verify');

/*
 * How far the shape's centre may travel while it changes. A glyph that wanders
 * is what makes a morph look cheap, and this is the number that catches it: 0.5
 * units is 0.58px at --icon-lg. Measured is 0.084 at eight frames, and the same
 * to two decimals at 8, 11 and 16, so the frame count is not what moves it.
 */
const DRIFT_CEILING = 0.5;

/** Path data with whitespace collapsed, so formatting cannot fail a comparison. */
const flat = d => d.replace(/\s+/g, ' ').trim();

function verify(file) {
  const html = readFileSync(file, 'utf8');
  const problems = [];
  const rel = path.relative(designDir, file);

  const carrier = html.match(
    /<svg\b[^>]*\bdata-morph="([^"]+)"[^>]*>([\s\S]*?)<\/svg>/
  );
  const openTagOf = m => m[0].slice(0, m[0].indexOf('>'));
  if (!carrier) {
    problems.push(
      `${rel} has no <svg data-morph="...">, so the morph's provenance is ` +
        `undeclared and nothing holds the frame data to its generator`
    );
    return problems;
  }
  const [, name, body] = carrier;
  if (name !== MORPH.name) {
    problems.push(
      `${rel} declares data-morph="${name}", expected "${MORPH.name}"`
    );
  }

  /*
   * The carrier needs its own viewBox. A <use> does not, because the symbol
   * carries one, and every other glyph in the tree is a <use>, so the omission
   * looks harmless and is invisible in review. The strip's geometry is inline,
   * so without it the box falls back to one user unit per pixel: the glyph draws
   * at 28/24 of its size and the strip's 24 unit spacing becomes 24 pixels of a
   * 28 pixel box. Nothing overflows and nothing looks obviously wrong.
   */
  const openTag = openTagOf(carrier);
  if (!/\bviewBox="0 0 24 24"/.test(openTag)) {
    problems.push(
      `${rel} the morph's <svg> has no viewBox="0 0 24 24". The strip's geometry ` +
        `is inline rather than referenced, so the box has no coordinate system of ` +
        `its own and the glyph draws at the wrong size`
    );
  }

  const frames = buildFrames(MORPH.frames);
  const groups = [
    ...body.matchAll(
      /<g\b[^>]*transform="translate\(([^)]*)\)"[^>]*>([\s\S]*?)<\/g>/g
    )
  ];
  if (groups.length !== MORPH.frames) {
    problems.push(
      `${rel} holds ${groups.length} frame groups, the generator emits ${MORPH.frames}`
    );
  }

  groups.forEach((g, i) => {
    if (i >= frames.length) {
      return;
    }
    const [, offset, inner] = g;
    const want = frameOffset(i);
    if (offset.replace(/\s+/g, '') !== `${want} 0`.replace(/\s+/g, '')) {
      problems.push(
        `${rel} frame ${i} sits at translate(${offset}), the generator puts it at ` +
          `translate(${want} 0)`
      );
    }
    const got = [...inner.matchAll(/<path\b[^>]*\bd="([^"]*)"/g)].map(
      m => m[1]
    );
    const want2 = frames[i].paths;
    if (got.length !== want2.length) {
      problems.push(
        `${rel} frame ${i} has ${got.length} paths, the generator emits ${want2.length}`
      );
      return;
    }
    got.forEach((d, k) => {
      if (flat(d) === flat(want2[k])) {
        return;
      }
      problems.push(
        `${rel} frame ${i} path ${k} does not match the generator. The frames are ` +
          `computed, so this is a hand edit: run ` +
          `node docs/design/scripts/build-morph-frames.mjs and paste the strip.`
      );
    });
  });

  // The endpoints have to be the pinned glyphs, not something that resembles
  // them. This is the whole of the design record's promise for this control.
  const first = frames[0].paths;
  const last = frames[frames.length - 1].paths;
  if (first.join('|') !== PINNED.play.join('|')) {
    problems.push(`${rel} frame 0 is not player-play-filled verbatim`);
  }
  if (last.join('|') !== PINNED.pause.join('|')) {
    problems.push(
      `${rel} frame ${frames.length - 1} is not player-pause-filled verbatim`
    );
  }

  const inv = invariants(MORPH.frames);
  if (!inv.gapOpens) {
    problems.push(
      `${rel} the gap between the two pieces does not open monotonically, so they ` +
        `fuse or cross somewhere in the middle`
    );
  }
  if (inv.minGap < -0.01) {
    problems.push(
      `${rel} the two pieces overlap by ${Math.abs(inv.minGap).toFixed(2)} units`
    );
  }
  if (inv.areaDip > MORPH.areaDipCeiling) {
    problems.push(
      `${rel} the ink area sags ${inv.areaDip.toFixed(1)}% below its start, over the ` +
        `${MORPH.areaDipCeiling}% ceiling. A sag that size is a pinch, and the shape ` +
        `that had one was built with its arcs inside-out`
    );
  }
  if (inv.centreDrift > DRIFT_CEILING) {
    problems.push(
      `${rel} the centre travels ${inv.centreDrift.toFixed(3)} units, over the ` +
        `${DRIFT_CEILING} ceiling`
    );
  }

  // The CSS carries the step count and the travel, so both are held too.
  const wantCss = styleBlock().replace(/\s+/g, ' ').trim();
  const gotCss = (html.match(
    /\/\* The strip\.[\s\S]*?@keyframes pl-play-pause \{[\s\S]*?\n {6}\}/
  ) || ['', ''])[0];
  if (flat(gotCss) !== flat(wantCss)) {
    problems.push(
      `${rel} the strip's CSS does not match the generator, so the step count or the ` +
        `${STRIP_TRAVEL}px travel has drifted from the frame count`
    );
  }

  return problems;
}

if (verifyAt !== -1) {
  const target = process.argv[verifyAt + 1];
  if (!target) {
    process.stderr.write('--verify needs a file\n');
    process.exit(2);
  }
  const found = verify(path.resolve(target));
  if (found.length) {
    found.forEach(f => process.stderr.write(`  - ${f}\n`));
    process.exit(1);
  }
  const inv = invariants(MORPH.frames);
  // The endpoints are named on the success line because they are pinned glyphs
  // being drawn, just not as symbols, and the icon count in the gate summary has
  // to be able to credit them. Without this the tree reads one glyph short for
  // no reason a reader can see.
  process.stdout.write(
    `ok  ${MORPH.frames} frames, endpoints verbatim at @tabler/icons ${PIN_VERSION}, ` +
      `${VERTEX_COUNT} vertices, drift ${inv.centreDrift.toFixed(3)}, ` +
      `gap ${inv.minGap.toFixed(2)} to ${inv.maxGap.toFixed(2)}, ` +
      `area +${inv.areaRise.toFixed(0)}%/-${inv.areaDip.toFixed(1)}% ` +
      `endpoints=${ENDPOINT_ICONS.play},${ENDPOINT_ICONS.pause}\n`
  );
} else if (asJson) {
  const out = path.join(designDir, 'generated', 'play-pause-morph.json');
  const json = frameJson();
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(json, null, 2)}\n`);
  process.stdout.write(
    `wrote ${path.relative(process.cwd(), out)}: ${json.frames} frames, ` +
      `endpoints ${json.endpoints.play} and ${json.endpoints.pause} at ${json.pin}\n`
  );
} else {
  const inv = invariants();
  process.stdout.write(
    `play to pause, ${MORPH.frames} frames over ${MORPH.duration}\n` +
      `  pin            @tabler/icons ${PIN_VERSION}, endpoints verbatim\n` +
      `  vertices       ${VERTEX_COUNT} per piece, derived from the outlines\n` +
      `  centre drift   ${inv.centreDrift.toFixed(3)} units, ceiling 0.5\n` +
      `  min gap        ${inv.minGap.toFixed(2)} units, opens: ${inv.gapOpens}\n` +
      `  area           rises ${inv.areaRise.toFixed(0)}%, dips ${inv.areaDip.toFixed(1)}%\n\n`
  );
  process.stdout.write(
    '--- paste into playlist-header.html, inside the <svg> ---\n'
  );
  process.stdout.write(`${stripBlock()}\n\n`);
  process.stdout.write(
    '--- paste into playlist-header.html, inside the <style> ---\n'
  );
  process.stdout.write(`${styleBlock()}\n`);
}
