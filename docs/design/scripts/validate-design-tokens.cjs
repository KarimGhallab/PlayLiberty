#!/usr/bin/env node

/**
 * Validates the design tokens and the specimens that consume them.
 *
 * Ten checks, all of them things that are easy to state in a document and easy
 * to break in practice:
 *
 *   1. tokens.css is pure. Every declaration in it is a custom property. This is
 *      the file task 10 transcribes, so a stray rule or at-rule here would end up
 *      in the shipped package.
 *   2. No specimen hard-codes a colour that a token already carries.
 *   2e. Every enum value the design shows a state for has exactly one word, and
 *       the word is actually drawn, so no state is invented and none is missing.
 *   2c. No token is declared as another token, which ADR 0009 rejects because
 *       React Native cannot resolve var(). Two tokens may hold the same literal
 *       when they are two names for one decision, and 2d holds them to it.
 *   2b. No :hover rule paints with a tone token. A tone is how a thing is, and
 *       hover is not a thing, so this is the one mistake here that no ratio can
 *       catch and it has to be forbidden outright.
 *   3. Every declared text pairing clears WCAG AA, computed rather than asserted.
 *   4. Every declared control boundary clears the 3:1 of WCAG 1.4.11, which is a
 *      different rule from the text one and catches a different mistake: a colour
 *      can pass every text pairing in the system and still be too faint to see a
 *      checkbox by.
 *   5. Every ratio printed on a specimen still matches the tokens.
 *   6. No file references a token that tokens.css does not define.
 *   7. Every ratio quoted in docs/DESIGN.md still matches the tokens.
 *   8. Every relative link in the tree resolves to a file that exists.
 *   2h. A control that centres an icon and sizes itself declares its padding. A
 *       button's user-agent padding makes the content box smaller than the control, so
 *       the icon ends up centred in the wrong box, by less than a pixel and therefore
 *       invisible in a screenshot.
 *   2g. No specimen types a mark as a character. A typed glyph is drawn by whatever
 *       font is installed, which is the failure ADR 0009 and ADR 0010 both exist to
 *       prevent, and it is invisible in a screenshot because the specimen renders in
 *       the family it was measured in.
 *   2f. Every glyph is the pinned set's geometry, verbatim. ADR 0010 rules out a
 *       hand-drawn icon, and the path data for the pin lives in this file, so
 *       drawing an arrowhead by hand fails the run rather than being noticed
 *       later, on a phone, as two clients drawing different artwork.
 *
 * And one that cannot fail, which exists so the losing options stay honest: the
 * rejected candidates hold their measured values, so a document can say what the
 * alternatives were without those numbers quietly going stale.
 *
 * The pairing lists live here rather than in tokens.css, because a pairing is a
 * decision about which colours are legal together, not a value. tokens.css carries
 * values only.
 *
 * Run from anywhere: node docs/design/scripts/validate-design-tokens.cjs
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const designDir = path.resolve(__dirname, '..');
const tokensPath = path.join(designDir, 'tokens.css');
const failures = [];

/* ------------------------------------------------------------------ helpers */

/**
 * Every CSS rule in a stylesheet or a specimen's style block, as selector and
 * body, in one linear pass.
 *
 * This replaces a /([^{}]+)\{([^{}]*)\}/g scan that was fine when the largest
 * file was 25KB and cost thirty seconds when it was 118KB. The pattern is
 * quadratic on any run of text containing no braces: at each start position it
 * consumes the whole remaining run looking for a brace, fails, and the engine
 * retries one character later. The track row carries sixteen copies of the play
 * to pause morph, so its body is 90KB with no braces in it at all, and the scan
 * spent all its time there rather than on any rule. Four checks used the
 * pattern, which is why the cost arrived as a mystery rather than as one edit.
 *
 * Walking the braces cannot backtrack. A rule's selector is whatever sits
 * between the previous closing brace and this opening one, and its body is
 * whatever sits between this brace and the next.
 */
function cssRules(css) {
  const out = [];
  let cursor = 0;
  for (;;) {
    const open = css.indexOf('{', cursor);
    if (open === -1) break;
    const close = css.indexOf('}', open + 1);
    const selector = css.slice(cursor, open).trim();
    if (selector) {
      out.push({
        selector,
        body: css.slice(open + 1, close === -1 ? css.length : close)
      });
    }
    cursor = close === -1 ? css.length : close + 1;
  }
  return out;
}

const read = file => fs.readFileSync(file, 'utf8');

/** Remove block comments so commented-out CSS is never parsed as real. */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function parseTokens(css) {
  const tokens = new Map();
  const block = stripComments(css).match(/:root\s*\{([\s\S]*)\}/);
  if (!block) {
    return { tokens, malformed: true };
  }
  for (const chunk of block[1].split(';')) {
    const match = chunk.trim().match(/^(--[a-zA-Z0-9_-]+)\s*:\s*(.+)$/);
    if (match) {
      tokens.set(match[1], match[2].trim());
    }
  }
  return { tokens, malformed: false };
}

/* --------------------------------------------------------------- colour math */

/**
 * Resolve a token to its literal value, following var() aliases.
 *
 * A token is allowed to be declared as another token. That is how one colour can
 * carry two names without becoming two values free to drift: --tone-downloading
 * is var(--emphasis), so the downloading state and the emphasis colour are the
 * same amber by construction rather than by a comment asking people not to
 * change one without the other.
 *
 * The chain is followed to whatever depth it goes, and a cycle is reported
 * rather than left to hang.
 */
const reportedCycles = new Set();

function resolve(name, seen = []) {
  const raw = tokens.get(name);

  if (raw === undefined) {
    return '';
  }
  if (!raw.startsWith('var(')) {
    return raw;
  }
  if (seen.includes(name)) {
    // Reported once per cycle rather than once per lookup. Every pairing that
    // touches the cycle would otherwise repeat the same sentence, and a check
    // that says the same thing thirteen times is a check nobody reads.
    const cycle = [...seen, name].join(' -> ');
    if (!reportedCycles.has(cycle)) {
      reportedCycles.add(cycle);
      failures.push(`token ${name} is circular: ${cycle}`);
    }
    return '';
  }

  const inner = raw.slice(raw.indexOf('var(') + 4, raw.lastIndexOf(')')).trim();
  return resolve(inner, [...seen, name]);
}

function parseColor(value) {
  const input = value.trim();

  const hex = input.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (hex) {
    const digits = hex[1].length === 3 ? hex[1].replace(/./g, '$&$&') : hex[1];
    return {
      r: parseInt(digits.slice(0, 2), 16),
      g: parseInt(digits.slice(2, 4), 16),
      b: parseInt(digits.slice(4, 6), 16),
      a: 1
    };
  }

  const rgb = input.match(
    /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+%?))?\s*\)$/
  );
  if (rgb) {
    let alpha = 1;
    if (rgb[4] !== undefined) {
      alpha = rgb[4].endsWith('%')
        ? parseFloat(rgb[4]) / 100
        : parseFloat(rgb[4]);
    }
    return { r: +rgb[1], g: +rgb[2], b: +rgb[3], a: alpha };
  }

  return null;
}

/** Composite a translucent colour over an opaque backdrop before measuring it. */
function flatten(foreground, backdrop) {
  if (foreground.a >= 1) {
    return foreground;
  }
  // Quantised to 8 bits per channel, because that is what the compositor
  // actually puts on the screen. A float-only calculation is more precise and
  // less true: it reports 3.91:1 for ink at 45% where the display shows 3.93:1,
  // and the display is the thing a reader can pick and measure.
  return {
    r: Math.round(
      foreground.r * foreground.a + backdrop.r * (1 - foreground.a)
    ),
    g: Math.round(
      foreground.g * foreground.a + backdrop.g * (1 - foreground.a)
    ),
    b: Math.round(
      foreground.b * foreground.a + backdrop.b * (1 - foreground.a)
    ),
    a: 1
  };
}

function relativeLuminance(color) {
  const channel = raw => {
    const c = raw / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * channel(color.r) +
    0.7152 * channel(color.g) +
    0.0722 * channel(color.b)
  );
}

function contrastRatio(foreground, background) {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const AA = 4.5;

/* ---------------------------------------------------- 1. tokens.css is pure */

const { tokens, malformed } = parseTokens(read(tokensPath));

if (malformed) {
  failures.push('tokens.css has no :root block to read');
} else {
  const offenders = [];
  for (const line of stripComments(read(tokensPath)).split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === ':root {' || trimmed === '}') {
      continue;
    }
    if (trimmed.startsWith('@')) {
      offenders.push(`at-rule: ${trimmed}`);
    } else if (!/^--[a-zA-Z0-9_-]+\s*:/.test(trimmed)) {
      offenders.push(`not a custom property: ${trimmed}`);
    }
  }
  if (offenders.length) {
    failures.push(
      `tokens.css must contain only custom property declarations, found ${offenders.length}:` +
        '\n' +
        offenders.map(o => `   - ${o}`).join('\n')
    );
  }
}

/* ------------------------------------------- 2. specimens use no raw colours */

const tokenColors = new Map();
for (const [name, value] of tokens) {
  if (/^#[0-9a-fA-F]{3,8}$/.test(value) || /^rgba?\(/i.test(value)) {
    tokenColors.set(name, value.toLowerCase());
  }
}

/*
 * A file may opt out of the token rules by carrying this marker, which exists for
 * one reason: a prototype's floating switcher is chrome that is deliberately not
 * part of the design, so it is a light pill on a dark page and cannot use the
 * tokens. The marker is file-scoped, must be spelled out in full, and is reported
 * in the summary so an opt-out cannot quietly become the norm. No settled
 * specimen is allowed to use it.
 */
const OPT_OUT = 'impeccable-allow-foreign-colors';

const optedOut = file => read(file).includes(OPT_OUT);

function specimenFiles(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'scripts' && entry.name !== 'fonts') {
        found.push(...specimenFiles(full));
      }
    } else if (entry.name.endsWith('.html')) {
      found.push(full);
    }
  }
  return found;
}

const allHtml = specimenFiles(designDir);
const optedOutFiles = allHtml.filter(f => optedOut(f));
const specimens = allHtml.filter(f => !optedOut(f));

/*
 * A prototype is a throwaway file that never ships, and the provenance rules
 * further down are about geometry the two clients have to share. A morph
 * prototype cannot satisfy them by construction: its subject is a shape computed
 * from the pinned endpoints, so there is no name in the pinned set for it to
 * declare. Excluding prototypes from that scan is not a hole, because drawing a
 * shape by hand is still impossible inside one. A prototype that draws any
 * geometry at all has to carry the marker below, which the summary reports, so
 * generated geometry sitting in the tree can never be invisible.
 *
 * The stronger form of this rule, where a generated shape is a declared token
 * category rather than a file-level marker, belongs to the ADR amendments and
 * lands with the morph, not with the prototype that is asking for it.
 */
const GENERATED = 'generated-geometry: computed from the pinned endpoints';
const isPrototype = f => f.endsWith('.prototype.html');
const prototypes = allHtml.filter(isPrototype);
const shipped = allHtml.filter(f => !isPrototype(f));
const generatedDeclarations = [];

for (const file of prototypes) {
  const html = read(file);
  const draws =
    /<(path|circle|ellipse|polygon|polyline|line|rect)\b/.test(html) ||
    /<use\b[^>]*href="#(?!pin-)/.test(html);
  if (!draws) continue;
  if (!html.includes(GENERATED)) {
    generatedDeclarations.push(
      `${path.relative(designDir, file)} draws geometry but does not declare it: ` +
        `add the marker "${GENERATED}" if the shape is computed, or delete the drawing`
    );
  } else {
    generatedDeclarations.push(path.relative(designDir, file));
  }
}

const literals = [];

for (const file of specimens) {
  read(file)
    .split('\n')
    .forEach((line, index) => {
      const carriesStyle = /style="/.test(line) || /^\s*[-a-z]+\s*:/.test(line);
      if (!carriesStyle) {
        return;
      }
      for (const match of line.matchAll(
        /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g
      )) {
        const value = match[0];
        literals.push({
          file: path.relative(designDir, file),
          line: index + 1,
          value,
          known: [...tokenColors.values()].includes(value.toLowerCase())
        });
      }
    });
}

if (literals.length) {
  failures.push(
    `specimens must reference colour tokens rather than repeat a literal, found ${literals.length}:` +
      '\n' +
      literals
        .map(
          l =>
            `   - ${l.file}:${l.line}  ${l.value}${l.known ? '  (a token carries this)' : ''}`
        )
        .join('\n')
  );
}

/* ------------------------------------- 3. every text pairing clears AA (4.5) */

/**
 * Each entry is a pairing the design actually puts on screen, and the note says
 * where it appears, so a failure points at a screen rather than at two hex values.
 */
const PAIRINGS = [
  ['--ink', '--bg', 'primary text on the page'],
  ['--ink', '--surface', 'primary text on a row'],
  ['--ink', '--surface-raised', 'primary text on the player bar'],
  ['--muted', '--bg', 'durations and timestamps'],
  ['--muted', '--surface', 'durations on a row'],
  ['--muted', '--surface-raised', 'time on the player bar'],
  ['--accent', '--bg', 'accent text on the page'],
  ['--accent', '--surface', 'accent text on a row'],
  ['--accent', '--surface-raised', 'the focus ring on the player bar'],
  ['--bg', '--accent', 'the legend on an accent button'],
  ['--bg', '--accent-hover', 'the legend on a hovered accent button'],
  ['--bg', '--tone-downloading', 'the legend on a filled amber badge'],
  ['--tone-pending', '--bg', 'pending label'],
  ['--tone-pending', '--surface', 'pending label on a row'],
  ['--tone-pending', '--surface-raised', 'pending label, the tightest case'],
  ['--emphasis', '--bg', 'emphasis text on the page'],
  ['--emphasis', '--surface', 'emphasis text on a row'],
  [
    '--emphasis',
    '--surface-raised',
    'emphasis text on the player bar, the tightest case'
  ],
  ['--tone-downloading', '--bg', 'downloading label'],
  ['--tone-downloading', '--surface', 'downloading label on a row'],
  [
    '--tone-downloading',
    '--surface-raised',
    'downloading label on the player bar'
  ],
  ['--tone-stored', '--surface', 'stored label on a row'],
  ['--tone-failed', '--bg', 'failed label'],
  ['--tone-failed', '--surface', 'failed label on a row'],
  [
    '--tone-failed',
    '--surface-raised',
    'failed label, retried so the loud one'
  ],
  ['--tone-unavailable', '--bg', 'unavailable label'],
  ['--tone-unavailable', '--surface', 'unavailable label on a row'],
  [
    '--tone-unavailable',
    '--surface-raised',
    'unavailable label, never resolves'
  ],
  ['--tone-removed', '--bg', 'removed and retained label'],
  ['--tone-removed', '--surface', 'removed label on a row'],
  ['--tone-removed', '--surface-raised', 'removed label on the player bar'],
  // Declared so its ratio is computed rather than asserted. It is expected to sit
  // below the AA threshold, which is the point: it is the pairing the system
  // forbids, and both DESIGN.md and the colour specimen quote its number.
  ['--ink', '--accent', 'FORBIDDEN: a light legend on an accent control'],
  // Form controls. --bg on --accent is already declared above because a button
  // legend needs it; a checked checkbox, a radio dot and a switch knob all draw
  // the same near-black glyph on the same accent, so one declaration covers them.
  ['--control-disabled-fg', '--surface', 'a disabled label sitting on a row'],
  ['--control-disabled-fg', '--bg', 'a disabled label on the page'],
  [
    '--control-disabled-fg',
    '--control-disabled-bg',
    'a disabled label on a disabled fill, the tightest case'
  ],
  ['--muted', '--control-disabled-bg', 'the placeholder in a disabled field']
];

/* ------------------------------- 3b. every control boundary clears 3:1
 *
 * WCAG 1.4.11 asks 3:1 for the visual information required to identify a
 * control, which is the boundary of the control, not its label. This is a
 * separate rule from the text rule above and it is the one that rejected the
 * control border value first picked by eye in the prototype, which measured
 * 2.21:1 on --surface. A colour can pass every text pairing in the system and
 * still be too faint to see a checkbox by, so it gets its own check.
 */

const BOUNDARIES = [
  ['--control-border', '--bg', 'a control on the page'],
  ['--control-border', '--surface', 'a control on a row, the tightest case'],
  ['--control-border', '--surface-raised', 'a control on the player bar'],
  ['--accent', '--bg', 'the accent fill against the page, unchecked box'],
  ['--accent', '--surface', 'the accent fill against a row'],
  ['--accent', '--surface-raised', 'the accent fill against the player bar'],
  ['--accent-hover', '--bg', 'a hovered accent fill on the page'],
  ['--accent-hover', '--surface', 'a hovered accent fill on a row'],
  [
    '--accent-hover',
    '--surface-raised',
    'a hovered accent fill on the player bar'
  ],
  /*
   * A translucent backdrop has to be composited before it can be compared, and
   * the scrim only ever dims page content, so --bg is what lies underneath it.
   * Without this the check would read --scrim as if it were solid black and
   * report a number no one ever sees.
   */
  ['--control-border', '--scrim', 'the edge of a dialog against its scrim'],
  /*
   * Declared so the rejected value stays rejected. --line over a scrim is the
   * edge the dialog used to have, and it measured 1.19:1: a border that is
   * drawn and cannot be seen. If a future change makes --line louder and this
   * line starts passing, the design has drifted from the decision without
   * anyone having made the decision.
   */
  [
    '--line',
    '--scrim',
    'FORBIDDEN: the dialog edge that was drawn and invisible'
  ],
  [
    '--line',
    '--surface',
    'FORBIDDEN: a hairline, right for rows and wrong for a control'
  ],
  /*
   * The amber hover, kept as a ruled-out boundary. It measured well, which is
   * exactly why it is worth holding: it passed every numeric check and was still
   * the wrong colour, because a hover that turns the action colour into the
   * progress colour makes one control mean two things depending on the pointer.
   */
  [
    '--tone-downloading',
    '--surface',
    'FORBIDDEN: the amber hover, which turned the action colour into the progress one'
  ]
  /*
   * --control-disabled-bg is deliberately absent. It measures 1.13:1 against
   * --surface and that is the intent: a disabled control should not read as
   * actionable, and 1.4.11 exempts inactive components from the 3:1 rule for
   * exactly that reason. Declaring it here would either fail the run or force a
   * value that makes a dead control look live. What it must clear instead is
   * the text pairing against --control-disabled-fg, which is declared above.
   */
];

const NON_TEXT = 3.0;
const boundaries = [];

for (const [fgName, bgName, note] of BOUNDARIES) {
  const fg = parseColor(resolve(fgName));
  const bg = parseColor(resolve(bgName));

  if (!fg || !bg) {
    failures.push(
      `boundary names a token that does not exist: ${fgName} on ${bgName}`
    );
    continue;
  }

  // A translucent backdrop is composited over --bg first, because that is the
  // only thing the scrim ever covers. A solid one needs no such step.
  const page = resolve('--bg');
  const under = parseColor(page);
  const base = bg.a < 1 && under ? flatten(bg, parseColor(page)) : bg;

  const ratio = contrastRatio(flatten(fg, base), flatten(base, base));
  boundaries.push({ fgName, bgName, ratio, note });

  // A pairing marked FORBIDDEN is knowingly below the threshold, so it is
  // measured and reported but does not fail the run, the same as the text case.
  if (ratio < NON_TEXT && !note.startsWith('FORBIDDEN')) {
    failures.push(
      `${fgName} on ${bgName} is ${ratio.toFixed(2)}:1, below the ${NON_TEXT}:1 a control boundary needs (${note})`
    );
  }
}

const measured = [];

for (const [fgName, bgName, note] of PAIRINGS) {
  const fgRaw = resolve(fgName);
  const bgRaw = resolve(bgName);

  if (fgRaw === undefined || bgRaw === undefined) {
    failures.push(
      `pairing names a token that does not exist: ${fgName} on ${bgName}`
    );
    continue;
  }

  const fg = parseColor(fgRaw);
  const bg = parseColor(bgRaw);
  if (!fg || !bg) {
    failures.push(`could not parse a colour for ${fgName} on ${bgName}`);
    continue;
  }

  const ratio = contrastRatio(flatten(fg, bg), flatten(bg, bg));
  measured.push({ fgName, bgName, ratio, note });

  // A pairing marked FORBIDDEN is knowingly below the threshold, so it is
  // measured and reported but does not fail the run.
  const forbidden = note.startsWith('FORBIDDEN');
  if (ratio < AA && !forbidden) {
    failures.push(
      `${fgName} on ${bgName} is ${ratio.toFixed(2)}:1, below the ${AA}:1 required (${note})`
    );
  }
}

/* ------------------------------- 2b. a hover is not a state
 *
 * The primary button used to turn amber on hover, and no numeric check could
 * catch it: the pairing measured well and looked reasonable. The problem was
 * that a tone token is a vocabulary for how a thing IS, and hover is not one of
 * those things. Turning the action colour into the progress colour on pointer
 * entry makes a single control mean two different things depending on where the
 * pointer happens to be, and it makes hover into an emphasis, which at the rate
 * a pointer crosses a button is just noise.
 *
 * This cannot be phrased as a contrast rule, so it is stated directly: a hover
 * rule may not paint with a tone token. Amber and the fault reds are for states
 * and for one deliberate emphasis, not for anything the pointer causes.
 */

const toneHovers = [];

for (const file of specimens) {
  const css = read(file);

  // Every :hover block, with the declarations inside it, up to the closing brace.
  for (const match of css.matchAll(/:hover[^{]*\{([^}]*)\}/g)) {
    const body = match[1];

    // One report per offending rule rather than per declaration, so a rule that
    // paints both a background and a border does not read as two mistakes.
    const tones = [
      ...new Set([...body.matchAll(/--tone-[a-z-]+/g)].map(d => d[0]))
    ];

    if (tones.length) {
      const line = css.slice(0, match.index).split('\n').length;
      toneHovers.push(
        `${path.relative(designDir, file)}:${line} a :hover rule paints with ${tones.join(' and ')}`
      );
    }
  }
}

failures.push(...toneHovers);

/* ---------------------------------- 3a. every relative link resolves
 *
 * The index lists what the design system will contain, which means it lists
 * things that do not exist yet. Two of those were live links to nothing, and a
 * reader clicking through a design system should not discover the state of the
 * work by hitting a 404. Anything genuinely unbuilt is marked as such in the
 * markup instead, and this check keeps it that way as the tree grows.
 */

const deadLinks = [];
const seenLinks = new Set();

/* Every link in the tree, from a specimen's href and from a markdown link in the
 * decision record. The record used to be one file, and the split put fifteen of
 * them next to each other with relative paths between them, so a link that
 * resolved from docs/ does not resolve from docs/design-system/components/. A dead
 * link check that walked only the HTML would have passed the split without ever
 * looking at it, which is the same failure as a check narrowed to the one file
 * that is small enough to eyeball.
 *
 * The tracker joined the walk for the same reason, and after the screen inventory
 * landed in it. The tickets are where the design and the work point at each other:
 * a ticket links into docs/design-system/, the design record links out to a
 * ticket, and both use paths relative to where they sit. A relative path written
 * from docs/tracker/tasks/ does not resolve from docs/, and one `..` short is
 * enough to break one. The failure is invisible in review because the link is
 * correct-looking and the file exists, just not at the address. */
const MARKDOWN_LINK = /\]\(([^)\s]+)\)/g;

/* matchAll clones the pattern and never advances the original's lastIndex, so one
 * global pattern is safe to share across every markdown file here. Asserted rather
 * than assumed, because a pattern that silently started matching from a stale
 * offset would skip links and pass, which is the one outcome this check must not
 * have. */
function markdownSources(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
    .map(entry => path.join(entry.parentPath, entry.name))
    .sort()
    .map(file => ({ file, pattern: MARKDOWN_LINK }));
}

const docsDir = path.resolve(designDir, '..');
const linkSources = [
  ...allHtml.map(file => ({ file, pattern: /href="([^"]+)"/g })),
  ...markdownSources(path.resolve(docsDir, 'design-system')),
  ...markdownSources(path.resolve(docsDir, 'tracker')),
  { file: path.resolve(docsDir, 'DESIGN.md'), pattern: MARKDOWN_LINK }
];

for (const { file, pattern } of linkSources) {
  for (const match of read(file).matchAll(pattern)) {
    const href = match[1];

    // Only local relative paths are checkable. A fragment, a scheme and a
    // protocol-relative URL are all somebody else's problem.
    if (/^(#|[a-z]+:|\/\/)/i.test(href)) continue;
    // Nor is a template placeholder. A prototype that assembles markup in a
    // string writes href="${href}", and the first version of a transport
    // prototype failed on its own placeholder rather than on anything wrong. No
    // real relative path begins with "${", so the exemption cannot hide a dead
    // link; it can only stop the check reading a JavaScript expression as a URL.
    if (href.includes('${')) continue;

    const target = path.resolve(path.dirname(file), href.split('#')[0]);
    const key = `${file} -> ${href}`;

    if (seenLinks.has(key)) continue;
    seenLinks.add(key);

    if (!fs.existsSync(target)) {
      deadLinks.push(
        `${path.relative(docsDir, file)} links to ${href}, which does not exist`
      );
    }
  }
}

failures.push(...deadLinks);

/* ------------------------------- 2c. no token is declared as a token
 *
 * ADR 0009 rejects aliased tokens outright: React Native cannot resolve var(),
 * and with one dark theme there is nothing to re-theme. So a token declared as
 * another token is not a style preference here, it is a value that will reach
 * the phone as an unresolved string.
 *
 * This was violated once, deliberately, to make --tone-downloading and
 * --emphasis structurally impossible to disagree, and that reasoning was sound
 * while the mechanism was wrong. The two now hold the same literal and the next
 * check holds them to it.
 */

const aliased = [];

for (const [name, value] of tokens) {
  if (value.startsWith('var(')) {
    aliased.push(
      `${name} is declared as ${value}, which ADR 0009 rejects: React Native cannot resolve var()`
    );
  }
}

failures.push(...aliased);

/* ------------------------- 2d. tokens that share a decision share a value
 *
 * Two names for one decision is legitimate and sometimes necessary: amber is
 * both a track state and the emphasis colour, and neither name is wrong on its
 * own. Since they cannot be one token aliasing the other, the only thing
 * standing between them and silent drift is this list, which is why it exists.
 */

const SHARED_VALUES = [
  ['--tone-downloading', '--emphasis', 'amber is one decision under two names']
];

for (const [a, b, why] of SHARED_VALUES) {
  const va = resolve(a);
  const vb = resolve(b);

  if (!va || !vb) {
    failures.push(
      `shared-value pair names a token that does not exist: ${a} and ${b}`
    );
  } else if (va !== vb) {
    failures.push(
      `${a} is ${va} and ${b} is ${vb}, but they are the same decision (${why}) and must hold the same value`
    );
  }
}

/* ------------------------- 2e. a state word per enum value, and no more
 *
 * The specimens label states in words as well as colour, which is the rule the
 * whole system rests on. The easy mistake is inventing a fourth word for a
 * three-value enum because a particular case felt like it needed one, and a
 * reader then has to work out whether it is a state or a variation. This reads
 * the enums and the words out of the contracts and the specimens and holds them
 * against each other, so "no state invented and none missing" is a check rather
 * than a reviewer's memory.
 *
 * The mapping is declared here rather than derived, because the word is a
 * design decision: the enum says idle and the design says "Up to date".
 *
 * The mapping held "Queued" for TrackFileStatus.pending for a while, and the
 * row drew "Pending". The check below did not notice, because it asked whether
 * the word appeared anywhere in the file, and "Queued" did: it is the first
 * word of the use column of the --tone-pending row in foundations/color.html,
 * which is rendered text saying what the tone is for and is not a state label
 * at all. So a wrong mapping sat here passing on an English sentence.
 *
 * Hence the narrower question this asks now: not whether the word appears, but
 * whether it is the exact text of an element carrying a state class, which is
 * what a state label is in this tree. A word that is also ordinary English can
 * no longer satisfy this by being used in a sentence, in a comment, or in an
 * attribute, and the mapping has to agree with what the row actually draws.
 */

const STATE_WORDS = [
  ['PlaylistSyncStatus', 'idle', 'Up to date', '--state-idle'],
  ['PlaylistSyncStatus', 'syncing', 'Syncing', '--state-syncing'],
  ['PlaylistSyncStatus', 'error', 'Sync failed', '--state-error'],
  ['TrackFileStatus', 'pending', 'Pending', '--state-pending'],
  ['TrackFileStatus', 'downloading', 'Downloading', '--state-downloading'],
  ['TrackFileStatus', 'failed', 'Failed', '--state-failed'],
  ['TrackFileStatus', 'unavailable', 'Unavailable', '--state-unavailable'],
  // Deliberately wordless. A stored track is the resting state and a label on it
  // would be a label on the absence of news, so the track row draws no state
  // label for it at all. That is a decision, and it has to be written down here
  // as one: a missing row would read as an oversight and this check exists
  // precisely because the two are hard to tell apart.
  [
    'TrackFileStatus',
    'stored',
    null,
    'the resting state says nothing on purpose'
  ]
];

const stateProblems = [];

/* The text of every element carrying a state class, which is what a state label
 * is in this tree. Comments and stylesheets are removed first, because a state
 * word inside either is not drawn, and what remains has to be a rendered
 * element whose class makes it a label rather than a mention.
 *
 * A flat match, because the labels are flat: a span holding text, not a wrapper
 * around other elements. A nested label would be read only as far as its first
 * closing tag, so one that grew a child would be reported with partial text and
 * fail. That is the safe direction to fail in, since it cannot pass silently. */
const drawnStateLabels = new Set();
const stateLabelPattern =
  /<(\w+)([^>]*\bclass="[^"]*\bstate\b[^"]*"[^>]*)>([\s\S]*?)<\/\1\s*>/g;

for (const file of specimens) {
  const source = read(file)
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  for (const match of source.matchAll(stateLabelPattern)) {
    drawnStateLabels.add(
      match[3]
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    );
  }
}

// Every word must be drawn as a state label, or the enum has a value the design
// has not expressed. A null word is a recorded decision to say nothing, and is
// exempt, but only because it has to be written down to be here at all.
for (const [enumName, value, word] of STATE_WORDS) {
  if (word === null) continue;

  if (!drawnStateLabels.has(word)) {
    stateProblems.push(
      `${enumName}.${value} is mapped to the word "${word}", which no specimen draws as a state label`
    );
  }
}

// And the enum must not have grown a value the mapping has not caught up with.
const enumsPath = path.resolve(
  designDir,
  '..',
  '..',
  'packages',
  'contracts',
  'src',
  'enums.ts'
);

if (fs.existsSync(enumsPath)) {
  const enums = read(enumsPath);

  for (const enumName of ['PlaylistSyncStatus', 'TrackFileStatus']) {
    const block = enums.match(
      new RegExp(`export enum ${enumName} \\{([\\s\\S]*?)\\}`)
    );
    if (!block) continue;

    const values = [...block[1].matchAll(/=\s*'([a-z]+)'/g)].map(m => m[1]);
    const mapped = STATE_WORDS.filter(w => w[0] === enumName).map(w => w[1]);

    for (const v of values) {
      if (!mapped.includes(v)) {
        stateProblems.push(
          `${enumName} has a value "${v}" that no state word is mapped to`
        );
      }
    }
  }
}

failures.push(...stateProblems);

/* ------------------------- 2f. glyph geometry is the pinned set's, not ours
 *
 * ADR 0010 takes icons from Tabler and rules out a hand-drawn glyph. A rule in a
 * document is easy to state and easy to break by drawing one arrowhead by hand,
 * so the geometry is held here instead: this is the pinned release's path data,
 * and a specimen's copy has to match it exactly. Editing a glyph in a specimen
 * fails the run.
 *
 * The table lives in this file rather than in tokens.css for the same reason the
 * pairing lists do. Which icon plays which role is a design decision; the path
 * data is the release's, and the two are not the same kind of thing. What the
 * specimens are allowed to disagree about is the role, never the drawing.
 *
 * Two forms of the same geometry are in the tree, and both are checked. Most
 * glyphs are a <symbol> referenced by <use>, which is markup. A mark that lives
 * inside a native <input> cannot hold children, so the checkbox marks are a mask
 * with the path in a data URI instead, and those are compared against the same
 * table.
 */

const ICON_VERSION = '3.48.0';

const PINNED_ICONS = {
  'player-play-filled': [
    'M6 4v16a1 1 0 0 0 1.524 .852l13 -8a1 1 0 0 0 0 -1.704l-13 -8a1 1 0 0 0 -1.524 .852z'
  ],
  'player-pause-filled': [
    'M9 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z',
    'M17 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z'
  ],
  'player-pause': [
    'M6 6a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1l0 -12',
    'M14 6a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1l0 -12'
  ],
  'player-skip-back': ['M20 5v14l-12 -7l12 -7', 'M4 5l0 14'],
  'player-track-next': ['M3 5v14l8 -7l-8 -7', 'M14 5v14l8 -7l-8 -7'],
  'arrows-shuffle': [
    'M18 4l3 3l-3 3',
    'M18 20l3 -3l-3 -3',
    'M3 7h3a5 5 0 0 1 5 5a5 5 0 0 0 5 5h5',
    'M21 7h-5a4.978 4.978 0 0 0 -3 1m-4 8a4.984 4.984 0 0 1 -3 1h-3'
  ],
  repeat: [
    'M4 12v-3a3 3 0 0 1 3 -3h13m-3 -3l3 3l-3 3',
    'M20 12v3a3 3 0 0 1 -3 3h-13m3 3l-3 -3l3 -3'
  ],
  'dots-vertical': [
    'M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0',
    'M11 19a1 1 0 1 0 2 0a1 1 0 1 0 -2 0',
    'M11 5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0'
  ],
  trash: [
    'M4 7l16 0',
    'M10 11l0 6',
    'M14 11l0 6',
    'M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12',
    'M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3'
  ],
  check: ['M5 12l5 5l10 -10'],
  minus: ['M5 12l14 0'],
  refresh: [
    'M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4',
    'M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4'
  ],
  'alert-triangle': [
    'M12 9v4',
    'M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0',
    'M12 16h.01'
  ],
  'circle-x': ['M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0', 'M10 10l4 4m0 -4l-4 4'],
  clock: ['M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0', 'M12 7v5l3 3'],
  playlist: [
    'M11 17a3 3 0 1 0 6 0a3 3 0 1 0 -6 0',
    'M17 17v-13h4',
    'M13 5h-10',
    'M3 9l10 0',
    'M9 13h-6'
  ],
  pencil: [
    'M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4',
    'M13.5 6.5l4 4'
  ],
  'rotate-clockwise': ['M4.05 11a8 8 0 1 1 .5 4m-.5 5v-5h5'],
  share: [
    'M3 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0',
    'M15 6a3 3 0 1 0 6 0a3 3 0 1 0 -6 0',
    'M15 18a3 3 0 1 0 6 0a3 3 0 1 0 -6 0',
    'M8.7 10.7l6.6 -3.4',
    'M8.7 13.3l6.6 3.4'
  ],
  /* The share family, and the reading of it is worth stating because the three
   * are not interchangeable decoration. The padlock is the ownership signal and
   * it is present in both owned states, so the difference between them is the
   * arrow and nothing else: a lock is a playlist only you can see, a lock with
   * an arrow is a playlist you still hold the keys to but have let somebody in.
   * The third replaces the padlock with a person, and that is the state where
   * the keys belong to somebody else. So one axis is who holds the keys and the
   * other is whether anybody else has been given one, and every pair of the
   * three differs on exactly one of them.
   *
   * Verbatim from @tabler/icons@3.48.0, the outline variants, which is the pin's
   * default: ADR 0010 allows a filled glyph only where filled means something an
   * outlined one would not, and the set has a filled lock that this does not
   * want. The package's first path is the bounding-box filler every glyph in the
   * set carries and none of the pins above keep, so the paths below start at the
   * real geometry like the rest of the table.
   */
  lock: [
    'M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6',
    'M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0',
    'M8 11v-4a4 4 0 1 1 8 0v4'
  ],
  'lock-share': [
    'M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0',
    'M12 21h-5a2 2 0 0 1 -2 -2v-6a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2',
    'M8 11v-4a4 4 0 1 1 8 0v4',
    'M16 22l5 -5',
    'M21 21.5v-4.5h-4.5'
  ],
  'user-share': [
    'M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0',
    'M6 21v-2a4 4 0 0 1 4 -4h3',
    'M16 22l5 -5',
    'M21 21.5v-4.5h-4.5'
  ],
  'cloud-download': [
    'M19 18a3.5 3.5 0 0 0 0 -7h-1a5 4.5 0 0 0 -11 -2a4.6 4.4 0 0 0 -2.1 8.4',
    'M12 13l0 9',
    'M9 19l3 3l3 -3'
  ]
};

/** Collapse the whitespace a formatter is free to change and nothing else. */
/**
 * The glyphs that do not sit in the middle of their own box, and the shift each
 * one gets so it does. Units of the 24 unit grid, so the numbers here are the
 * ones the specimen prints, and the correction is a position rather than a size:
 * the glyph is still drawn at the token size, so both clients still agree on one
 * number per step.
 *
 * The checkbox tick is off by half a unit and is absent on purpose. Half a unit
 * is 0.33px inside an 18px box, which is below the correction's own threshold, so
 * correcting it would be a number in a stylesheet that changes nothing on screen.
 */
const PINNED_OPTICAL = {
  'player-play-filled': [-1.5, 0],
  'player-track-next': [-0.5, 0],
  'alert-triangle': [0, 0.69],
  'cloud-download': [-0.31, -1.44],
  /* The share family carries a second reason for the table, which is that the
   * three states are the same indicator showing different facts, and an
   * indicator that moves when the fact changes is reporting the wrong thing.
   * Measured on the pinned outlines at 24 units, the three ink centres sit at
   * 0, 1 and 1.5 units right of the middle of their own boxes, so a header
   * showing a private playlist and the same header showing it shared would put
   * the glyph 0.83px apart at --icon-md. In a column of cards that reads as a
   * ragged left edge rather than as three states of one thing, and nothing else
   * on this header is allowed to shift because a fact about the playlist
   * changed, so the two that sit off the middle are corrected back onto it.
   *
   * lock needs no entry and the check says so: it is centred in its own box
   * already, and carrying the class would push it off.
   */
  'lock-share': [-1, -0.5],
  'user-share': [-1.5, -0.5]
};

const OPTICAL_CLASS = 'icon--optical';

/** Read a shift as a position rather than as a pair of signed numbers. */
function describeShift([x, y]) {
  const parts = [];
  if (x) parts.push(`${Math.abs(x)} units ${x < 0 ? 'left' : 'right'}`);
  if (y) parts.push(`${Math.abs(y)} units ${y < 0 ? 'up' : 'down'}`);
  return parts.length ? parts.join(' and ') : '0 units';
}

const normPath = d => d.replace(/\s+/g, ' ').trim();

const iconProblems = [];
const iconsUsed = new Set();
let morphPathCount = 0;

for (const file of shipped) {
  const html = read(file);
  const rel = path.relative(designDir, file);

  // A drawing primitive outside a <symbol> is a glyph somebody drew. The sprite
  // is the only place path data is allowed to live, and it has to say which
  // icon it is a copy of.
  const symbols = [...html.matchAll(/<symbol\b([\s\S]*?)<\/symbol>/g)];
  // Offsets from a matchAll over one match are relative to that match, not to
  // the file, so the sprite's own start has to be added back on before the
  // indices can be compared with the file-wide scan below.
  const insideSprite = new Set();
  for (const m of symbols) {
    for (const span of m[0].matchAll(/<path\b/g)) {
      insideSprite.add(m.index + span.index);
    }
  }

  /*
   * The morph strip is the one place a shape is drawn outside the sprite, and it
   * is drawn on purpose: its endpoints are pinned glyphs and the frames between
   * are computed from them, so the data cannot live in a symbol that claims to be
   * a copy of an icon. It declares itself with data-morph, and check 2j holds
   * every frame in it to the generator that produced it.
   *
   * The exemption is exactly as wide as the thing that replaces the guarantee. A
   * path inside a data-morph carrier is exempt here and checked there; a path
   * anywhere else is still a hand-drawn glyph.
   */
  const insideMorph = new Set();
  let morphPaths = 0;
  for (const m of html.matchAll(
    /<svg\b[^>]*\bdata-morph="[^"]*"[^>]*>[\s\S]*?<\/svg>/g
  )) {
    for (const span of m[0].matchAll(/<path\b/g)) {
      insideMorph.add(m.index + span.index);
      morphPaths += 1;
    }
  }
  morphPathCount += morphPaths;

  for (const m of html.matchAll(
    /<(path|circle|ellipse|polygon|polyline|line|rect)\b/g
  )) {
    const tag = m[1];
    if (
      tag === 'path' &&
      (insideSprite.has(m.index) || insideMorph.has(m.index))
    ) {
      continue;
    }
    const line = html.slice(0, m.index).split('\n').length;
    iconProblems.push(
      `${rel}:${line} a <${tag}> outside a <symbol>: ADR 0010 takes glyph geometry from the pinned set, so a drawn shape here is one that the two clients would not share`
    );
  }

  for (const m of symbols) {
    const attrs = m[1];
    const id = (attrs.match(/id="([^"]+)"/) || [])[1];
    const tag = (attrs.match(/data-icon="([^"]+)"/) || [])[1];

    if (!tag) {
      iconProblems.push(
        `${rel} the symbol ${id || '(unnamed)'} carries no data-icon, so nothing says which icon it is a copy of`
      );
      continue;
    }

    const [name, version] = tag.split('@');
    if (version !== ICON_VERSION) {
      iconProblems.push(
        `${rel} the symbol ${id} is ${tag}, but the pin is @${ICON_VERSION}`
      );
      continue;
    }
    if (!PINNED_ICONS[name]) {
      iconProblems.push(
        `${rel} the symbol ${id} claims to be ${name}, which is not an icon at this pin`
      );
      continue;
    }
    iconsUsed.add(name);

    const drawn = [...m[0].matchAll(/\sd="([^"]*)"/g)].map(x => normPath(x[1]));
    const expected = PINNED_ICONS[name].map(normPath);
    if (drawn.join('|') !== expected.join('|')) {
      iconProblems.push(
        `${rel} the symbol ${id} does not match ${name} at ${ICON_VERSION}:\n` +
          `        drawn   ${drawn.join(' ')}\n` +
          `        pinned  ${expected.join(' ')}`
      );
    }
  }

  // Every <use> has to name a symbol that is actually in the same file, or the
  // glyph silently renders as nothing and the specimen still looks plausible.
  const ids = new Set(symbols.map(m => (m[1].match(/id="([^"]+)"/) || [])[1]));
  for (const m of html.matchAll(/<use[^>]*href="#([^"]+)"/g)) {
    if (!ids.has(m[1])) {
      const line = html.slice(0, m.index).split('\n').length;
      iconProblems.push(
        `${rel}:${line} <use> names #${m[1]}, which is not a symbol in this file`
      );
    }
  }

  // The optical correction is attached to the reference and to nothing else.
  //
  // It first went on the <svg> around the <use>, which is wrong in a way that
  // looks fine: play and pause carry identical wrapper markup and differ only in
  // the href, so the triangle was centred correctly and the pause bars were
  // pushed 1.75px left of the middle of their own button. The correction is a
  // property of the artwork, so it is keyed to the artwork and a glyph that is
  // already centred is left alone.
  const symbolName = new Map();
  for (const m of symbols) {
    const tag = (m[1].match(/data-icon="([^"]+)"/) || [])[1];
    if (tag) {
      symbolName.set((m[1].match(/id="([^"]+)"/) || [])[1], tag.split('@')[0]);
    }
  }

  for (const m of html.matchAll(
    /<svg\b[^>]*class="[^"]*\bicon\b[^"]*"[^>]*>/g
  )) {
    if (new RegExp(`\\b${OPTICAL_CLASS}\\b`).test(m[0])) {
      const line = html.slice(0, m.index).split('\n').length;
      iconProblems.push(
        `${rel}:${line} ${OPTICAL_CLASS} is on the <svg> wrapper, where it lands on every glyph that control draws. It belongs on the <use>, because the href is what chooses the glyph`
      );
    }
  }

  for (const m of html.matchAll(/<use\b[^>]*>/g)) {
    const tag = m[0];
    const href = (tag.match(/href="#([^"]+)"/) || [])[1];
    const name = symbolName.get(href);
    if (!name) {
      continue;
    }
    const has = new RegExp(`class="[^"]*\\b${OPTICAL_CLASS}\\b`).test(tag);
    const wants = Object.prototype.hasOwnProperty.call(PINNED_OPTICAL, name);
    const line = html.slice(0, m.index).split('\n').length;
    if (wants && !has) {
      iconProblems.push(
        `${rel}:${line} <use> for ${name} carries no ${OPTICAL_CLASS}, and that glyph needs one: it sits ${describeShift(PINNED_OPTICAL[name])} off the middle of its own box`
      );
    }
    if (!wants && has) {
      iconProblems.push(
        `${rel}:${line} <use> for ${name} carries ${OPTICAL_CLASS}, but that glyph is centred in its own box and moving it pushes it off`
      );
    }
  }

  // The mask form, for the mark that has to live inside a native input. Same
  // table, so a mask cannot carry a drawing the sprite would have rejected.
  for (const m of html.matchAll(/data:image\/svg\+xml,([^'"]+)/g)) {
    let decoded;
    try {
      decoded = decodeURIComponent(m[1]);
    } catch {
      decoded = m[1];
    }
    // The decoded SVG may use either quote style depending on which one the
    // formatter settled on inside the url() token, so accept both.
    for (const d of [...decoded.matchAll(/\sd=["']([^"']*)["']/g)].map(x =>
      normPath(x[1])
    )) {
      const owner = Object.keys(PINNED_ICONS).find(name =>
        PINNED_ICONS[name].map(normPath).includes(d)
      );
      if (owner) {
        iconsUsed.add(owner);
      }
      if (!owner) {
        iconProblems.push(
          `${rel} a mask carries the path "${d}", which is not in the pinned set at ${ICON_VERSION}`
        );
      }
    }
  }
}

failures.push(
  ...iconProblems,
  ...generatedDeclarations.filter(g => g.includes('does not declare'))
);

/* ------------------ 2j. the morph's frames come from its generator
 *
 * ADR 0010 takes glyph geometry from the pin, and the play to pause morph is the
 * one place a shape is computed rather than pinned. Its two endpoints are still
 * the pinned glyphs verbatim and the frames between are derived from them, which
 * is what keeps the promise, but only if the derived data in the specimen is the
 * data the generator produces. Nothing enforces that on its own: the strip is
 * literal markup in a hand-written file, so a hand edit to a frame would be
 * invisible and the two clients would inherit it.
 *
 * So it is enforced. The comparison lives in the generator, which is ESM, and
 * this script is CommonJS, so it runs as a child process rather than being
 * bridged with a dynamic import that would put an async boundary through the
 * whole validator. One process per gate run costs less than that.
 */
const morphScript = path.join(designDir, 'scripts', 'build-morph-frames.mjs');
const morphProblems = [];
let morphReport = 'no specimen declares a morph';
if (fs.existsSync(morphScript)) {
  for (const file of specimens) {
    if (!read(file).includes('data-morph=')) continue;
    const run = spawnSync(process.execPath, [morphScript, '--verify', file], {
      encoding: 'utf8'
    });
    if (run.status !== 0) {
      for (const line of (run.stderr || '').split('\n')) {
        if (line.trim()) morphProblems.push(line.trim().replace(/^-\s*/, ''));
      }
      continue;
    }
    morphReport = (run.stdout || '').trim().split('\n')[0];
    // A morph endpoint is a pinned glyph drawn verbatim, so it counts as used
    // even though it is not a <symbol>. The names come from the generator, which
    // is where the pin is transcribed, rather than being repeated here.
    const ends = morphReport.match(/endpoints=([\w-]+),([\w-]+)/);
    if (ends) {
      iconsUsed.add(ends[1]);
      iconsUsed.add(ends[2]);
    }
  }
}
failures.push(...morphProblems);

/* ------------------ 2k. a transition names a time and a curve
 *
 * A `transition` shorthand has four legal slots: a property, up to two times, an
 * easing function, and a behaviour keyword. It has no numeric slot at all, so a
 * token that resolves to a bare number or to a length inside a `transition` is
 * always wrong.
 *
 * That is not a theoretical rule. form-controls.html carried four transitions
 * naming `var(--leading-normal)`, which is 1.35, a line height. A bare number is
 * not a valid easing function, so the whole declaration was dropped, silently,
 * and the checkbox tick, the radio dot, the switch knob and the input's focus
 * border had no transition at all: three controls that were meant to move
 * snapped instead. Every other rule about motion in this project was a sentence
 * in a document, and a sentence does not notice a dropped declaration.
 *
 * The check reads the substituted value rather than the token name, because the
 * shape of the value is what decides. Two tokens can hold the same number and
 * only one of them can be a curve.
 *
 * `animation` is deliberately not covered. It does have a numeric slot, the
 * iteration count, so a number there can be right and a rule against it would
 * fire on correct code.
 */
const curveProblems = [];

/**
 * Break a declaration value into its components on top level commas and
 * whitespace only, so a curve's own arguments stay in one piece. Both levels of
 * this mattered: splitting only on commas left the whole item as
 * `transform 120ms 1.35` and matched nothing, and splitting on whitespace alone
 * tore `cubic-bezier(0.4, 0, 0.2, 1)` into four numbers and reported the
 * curve's own 0.2 as the fault the check exists to find.
 */
function splitComponents(value) {
  const out = [];
  let depth = 0;
  let current = '';
  for (const ch of value) {
    if (ch === '(') depth += 1;
    else if (ch === ')') depth -= 1;
    if (depth === 0 && (ch === ',' || /\s/.test(ch))) {
      if (current) out.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  if (current) out.push(current);
  return out;
}

for (const file of specimens) {
  const rel = path.relative(designDir, file);
  const css = stripComments(read(file));
  for (const rule of cssRules(css)) {
    for (const decl of rule.body.matchAll(
      /(^|[;{\s])transition\s*:\s*([^;}]+)/g
    )) {
      const substituted = decl[2].replace(
        /var\(\s*(--[\w-]+)\s*\)/g,
        (_, name) => resolve(name) || ''
      );
      for (const token of splitComponents(substituted)) {
        if (/^-?\d*\.?\d+(px|rem|em)$/i.test(token)) {
          curveProblems.push(
            `${rel} a transition names ${token}, which is a length. A transition ` +
              `takes a time, a curve, a property or a behaviour and a length is ` +
              `none of them, so the declaration is dropped whole and whatever it ` +
              `was meant to animate snaps instead`
          );
          continue;
        }
        if (!/^-?\d*\.?\d+$/.test(token)) continue;
        if (/^0?\.?0*$/.test(token)) continue;
        const looksLikeLeading =
          token === '1.35' ||
          token === '1.2' ||
          token === '1.5' ||
          token === '1.4';
        curveProblems.push(
          `${rel} a transition names ${token}, a bare number.` +
            (looksLikeLeading
              ? ' That is a line height. It reads like an easing function because ' +
                'it sits beside a duration in the same declaration, and a bare ' +
                'number is not a valid curve, so the declaration is dropped whole. ' +
                'The curve is --ease-standard.'
              : ' A transition has no numeric slot at all, so it is dropped whole.')
        );
      }
    }
  }
}

failures.push(...curveProblems);

/* ------------------- 2l. the bars' phases are the rule, not a typed table
 *
 * Twenty rules of `animation-delay` and `--rest` are a table, and a table nobody
 * can check is a table that gets edited by hand one day and is wrong the next.
 * So the rule is declared in the artifact and the table is re-derived here:
 * phase i is (i * stride) mod M, the delay is -(phase / M) * period rounded to
 * 10ms, and the resting scale is the same walk read through a five-value cycle.
 * M = 2n - 1, where n is the bar count.
 *
 * n has to agree three ways, and all three are checked: the pitch arithmetic
 * against the host's own content box, the number of spans in the markup, and the
 * number of per-bar rules in the stylesheet. Two of the three agreeing is how a
 * strip ends up with one bar that never leaves lockstep with bar one.
 *
 * The rule's two load-bearing properties are asserted rather than trusted. gcd
 * (stride, M) = 1 is what guarantees no two bars share a phase, and M = 2n - 1 is
 * what stops the phases being an evenly spaced staircase, which reads as a wave
 * sweeping across the strip rather than as n independent bars.
 *
 * The counter-example is the article this was built from, which ships a -2.2s
 * delay on a 2.2s animation. That is phase-identical to zero, so two of its
 * three bars move as one, and no reader of the source could tell, because
 * -2200 and 0 are two different numbers and one phase.
 *
 * Every constant is read out of the CSS and the markup rather than restated
 * here: the bar width, the gap, each host's width and border, the period, the
 * slot count and the stride. This check cannot disagree with the artifact about
 * a number, only about whether the artifact satisfies its own rule. The pitch
 * identity it asserts is the one that was actually violated once: under
 * content-box sizing, fourteen bars came to stop 2px short of the artwork's
 * edge, which is the whole thing the bars were asked to do.
 */
const barGeometry = read(path.join(designDir, 'specimen.css'));
const specimenText = specimens.map(read).join('\n');
const BAND_HOSTS = ['cover', 'art'];
const restCycle = [0.35, 1, 0.55, 0.8, 0.42];

/** Read the declarations of one rule out of a stylesheet. */
function ruleBody(css, selector) {
  const i = css.indexOf(selector + ' {');
  if (i === -1) return null;
  const from = css.indexOf('{', i);
  let depth = 1;
  for (let j = from + 1; j < css.length && depth; j += 1) {
    if (css[j] === '{') depth += 1;
    if (css[j] === '}') depth -= 1;
    if (depth === 0) return css.slice(from + 1, j);
  }
  return null;
}

const barProblems = [];
const barsBase = ruleBody(barGeometry, '.bars') || '';
const barsSpan = ruleBody(barGeometry, '.bars > span') || '';
const barWidth = parseFloat((barsSpan.match(/width:\s*([\d.]+)px/) || [])[1]);
const period = parseFloat((barsBase.match(/--period:\s*([\d.]+)ms/) || [])[1]);
const gapToken = (barsBase.match(/gap:\s*var\((--[\w-]+)/) || [])[1];
const gap = gapToken ? parseFloat(resolve(gapToken)) : NaN;

if (!barWidth || !period || !gap) {
  barProblems.push(
    'specimen.css no longer states the bar width, the period or the gap, so the bars ' +
      'cannot be checked. A check that quietly stops reading its inputs is worse ' +
      'than no check'
  );
}

/* The strip's height has to come from one stated rule rather than a literal, so
   that "how far up the artwork does this reach" is a decision in the file. */
if (!/height:\s*var\(--bar-reach/.test(barsBase)) {
  barProblems.push(
    'specimen.css .bars does not size its height from --bar-reach, so how far up ' +
      'the artwork the strip reaches is a bare literal with nothing to point at'
  );
}

for (const host of BAND_HOSTS) {
  const where = `specimen.css .${host} > .bars`;
  const body = ruleBody(barGeometry, `.${host} > .bars`) || '';
  const m = Number((body.match(/--phase-slots:\s*(\d+)/) || [])[1]);
  const stride = Number((body.match(/--phase-stride:\s*(\d+)/) || [])[1]);

  if (!m || !stride) {
    barProblems.push(
      `${where} does not declare --phase-slots and --phase-stride`
    );
    continue;
  }

  /* n, first way: the pitch arithmetic against the host's own box. The host is
     declared in its own specimen, not here, so it is read from there. */
  const hostRule = ruleBody(specimenText, `.${host}`) || '';
  const hostW = parseFloat((hostRule.match(/width:\s*([\d.]+)px/) || [])[1]);
  const hostBorder = parseFloat(
    (hostRule.match(/border:\s*([\d.]+)px solid/) || [])[1] || '0'
  );

  /* n, second way: the spans actually in the markup, counted for this host
     only. A strip is a child of its artwork box, so the host is whatever class
     the immediately preceding div carries. */
  const byMarkupHost = new Map();
  for (const m2 of specimenText.matchAll(
    /<div class="(cover|art)">\s*<div class="bars"/g
  )) {
    const close = specimenText.indexOf('</div>', m2.index);
    const count = (specimenText.slice(m2.index, close).match(/<span/g) || [])
      .length;
    byMarkupHost.set(m2[1], Math.max(byMarkupHost.get(m2[1]) || 0, count));
  }
  const byMarkup = byMarkupHost.get(host) || 0;

  /* n, third way: the per-bar rules. */
  const declared = new Map();
  const perBar = new RegExp(
    `\\.${host} > \\.bars > :nth-child\\((\\d+)\\)\\s*\\{([^}]*)\\}`,
    'g'
  );
  let hit;
  while ((hit = perBar.exec(barGeometry)) !== null) {
    const delay = (hit[2].match(/animation-delay:\s*(-?[\d.]+)ms/) || [])[1];
    const rest = (hit[2].match(/--rest:\s*([\d.]+)/) || [])[1];
    declared.set(Number(hit[1]), {
      delay: delay === undefined ? null : Number(delay),
      rest: rest === undefined ? null : Number(rest)
    });
  }

  if (!hostW || !barWidth || !gap) {
    barProblems.push(
      `${where} cannot be measured: the host box or the bar geometry is gone`
    );
    continue;
  }

  const contentW = hostW - hostBorder * 2;
  const byPitch = Math.round((contentW + gap) / (barWidth + gap));
  if (Math.abs(byPitch * barWidth + (byPitch - 1) * gap - contentW) > 0.001) {
    barProblems.push(
      `${where} draws ${barWidth}px bars at a ${gap}px gap, and that does not fill ` +
        `the ${host}'s ${contentW}px content box at any whole count. The nearest is ` +
        `${byPitch} bars at ${(byPitch * barWidth + (byPitch - 1) * gap).toFixed(2)}px, ` +
        `so the strip cannot span the artwork's whole width`
    );
  }

  if (declared.size && declared.size !== byMarkup) {
    barProblems.push(
      `${where} has ${byMarkup} bars in the markup and ${declared.size} per-bar rules. ` +
        `A bar with no rule of its own has no phase and no resting scale, so it ` +
        `moves in lockstep with bar one`
    );
  }

  const n = declared.size || byMarkup;
  if (byMarkup && byPitch && byMarkup !== byPitch) {
    barProblems.push(
      `${where} has ${byMarkup} bars in its markup but ${byPitch} is the count that ` +
        `fills the ${host}'s ${contentW}px content box at ${barWidth}px and a ${gap}px gap`
    );
  }

  if (m !== 2 * n - 1) {
    barProblems.push(
      `${where} declares ${m} phase slots, and the rule is M = 2n - 1, which for ` +
        `${n} bars is ${2 * n - 1}. A slot count that is not 2n - 1 spaces the phases ` +
        `evenly and the strip reads as a travelling wave`
    );
  }

  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  if (gcd(stride, m) !== 1) {
    barProblems.push(
      `${where} strides ${stride} across ${m} slots and they share a factor of ` +
        `${gcd(stride, m)}, so ${gcd(stride, m)} bars land on one phase and move ` +
        `together. This is the fault the article shipped: a -2.2s delay on a 2.2s ` +
        `animation is phase-identical to zero`
    );
  }

  const seen = new Set();
  for (let i = 0; i < n; i += 1) {
    const phase = (i * stride) % m;
    const wantDelay = -Math.round(((phase / m) * period) / 10) * 10;
    const wantRest = restCycle[phase % restCycle.length];
    const got = declared.get(i + 1);
    if (!got) continue;
    if (got.delay !== wantDelay) {
      barProblems.push(
        `${where} bar ${i + 1} is at phase ${phase} of ${m}, which is ${wantDelay}ms, ` +
          `and it is declared ${got.delay}ms`
      );
    }
    if (got.rest === null || Math.abs(got.rest - wantRest) > 0.0001) {
      barProblems.push(
        `${where} bar ${i + 1} is at phase ${phase}, whose resting scale is ` +
          `${wantRest}, and it is declared ${got.rest}`
      );
    }
    seen.add(wantDelay);
  }
  if (seen.size && seen.size !== n) {
    barProblems.push(
      `${where} puts ${n - seen.size} bars on a phase another bar already holds`
    );
  }
}

failures.push(...barProblems);

/* --------------- 2m. a bar with a phase has a resting height of its own
 *
 * `animation: none` does not reset a transform, it removes the thing that was
 * animating it, so a bar with a negative delay and no plain declaration is left
 * wherever its delay happened to be. Under prefers-reduced-motion that is
 * fourteen arbitrary scales rather than fourteen chosen ones, and it is the
 * worst failure this component could have: the strip still looks like a strip,
 * so nothing anywhere reports that the motion is gone and the reader is handed
 * a still image of an equalizer caught mid-gesture.
 *
 * So a negative delay has to arrive with a resting value beside it. The two
 * pl-breathe loops do not fire this, deliberately: they carry no delay and no
 * transform, so switching them off leaves them at opacity 1, which is already
 * the correct resting value. The rule is about a phase, not about looping.
 */
const unphased = [];
/* specimen.css is in this list and not by accident. The table lives there, not in
   the specimens, so a version of this check that read only the HTML had never
   looked at a single bar and passed on a fault introduced into all twenty rules.
   A check that cannot see the thing it checks is worse than no check, because it
   is a claim of coverage. */
for (const file of [...specimens, path.join(designDir, 'specimen.css')]) {
  if (!fs.existsSync(file)) continue;
  const rel = path.relative(designDir, file);
  const css = stripComments(read(file));
  for (const rule of cssRules(css)) {
    const delay = rule.body.match(/animation-delay:\s*(-[\d.]+)ms/);
    if (!delay) continue;
    if (!/--rest\s*:/.test(rule.body)) {
      unphased.push(
        `${rel} ${rule.selector} delays by ${delay[1]}ms with no resting value, so ` +
          `with the animation switched off it freezes at whatever phase that delay ` +
          `chose rather than at a height somebody picked`
      );
    }
  }
}
failures.push(...unphased);

/* ------------------ 2o. a control that appears on hover also appears on focus
 *
 * A control revealed only by :hover is a control that does not exist for anyone
 * using a keyboard, and the failure is invisible in a screenshot because a
 * hidden control and an absent one look identical. It is also a trap rather than
 * an absence, because the control is in the tab order: tabbing lands on
 * something invisible, and the ring is drawn on a box the reader cannot see.
 *
 * The obvious implementation is the one that breaks it. `visibility: hidden`
 * takes the element out of the tab order, so :focus-within can never fire and
 * the control is unreachable rather than merely hidden. `opacity: 0` leaves it
 * focusable, which is why the row's control uses opacity, and then
 * `pointer-events` has to be taken back at the same time because an invisible
 * control is still clickable and a click that lands on nothing is a mis-hit.
 *
 * So the rule is: if a subject is hidden at rest and a :hover rule reveals it,
 * some :focus-within or :focus-visible rule has to reveal it too. The row's
 * overflow menu does not fire this, and should not: it is visible at rest, so
 * focus has nothing to reveal.
 */
const hoverOnly = [];
for (const file of specimens) {
  const rel = path.relative(designDir, file);
  const css = stripComments(read(file));
  const rules = cssRules(css);

  const hiddenAtRest = new Set();
  const revealedOnHover = new Set();
  const revealedOnFocus = new Set();

  /*
   * The subject of a selector is its last compound, which is the element the
   * rule is about. A rule like `.row:hover .play:not(:disabled)` is about
   * `.play:not(:disabled)`.
   *
   * The :not() is then dropped, and that step is what makes the check work
   * rather than merely run. The rule that hides says `.play { opacity: 0 }` and
   * the rule that reveals on hover says `.play:not(:disabled)`, so the first
   * version compared two different strings, found nothing that was both hidden
   * and revealed on hover, and passed on every file, including one with the
   * focus reveal deleted outright. A :not() is a condition on an element
   * rather than part of what the element is, and the condition is not what this
   * rule is about.
   */
  const subjectOf = selector =>
    selector
      .split(',')
      .map(part =>
        part
          .trim()
          .replace(/:(hover|focus-within|focus-visible|focus)\b/g, '')
          .split(/\s+/)
          .filter(Boolean)
          .pop()
      )
      .filter(Boolean)
      .map(subject => subject.replace(/:not\([^)]*\)/g, ''));
  const declaresVisible = body =>
    /opacity:\s*1\b/.test(body) || /visibility:\s*visible/.test(body);
  const declaresHidden = body =>
    /opacity:\s*0\b/.test(body) || /visibility:\s*hidden/.test(body);

  for (const rule of rules) {
    const selector = rule.selector;
    const body = rule.body;
    const subjects = subjectOf(selector);
    if (selector.includes(':hover') && declaresVisible(body)) {
      for (const s of subjects) revealedOnHover.add(s);
    }
    if (
      /:focus-within|:focus-visible/.test(selector) &&
      declaresVisible(body)
    ) {
      for (const s of subjects) revealedOnFocus.add(s);
    }
    if (
      declaresHidden(body) &&
      !selector.includes(':hover') &&
      !/:focus/.test(selector)
    ) {
      for (const s of subjects) hiddenAtRest.add(s);
    }
  }

  for (const subject of revealedOnHover) {
    if (!hiddenAtRest.has(subject)) continue;
    if (revealedOnFocus.has(subject)) continue;
    hoverOnly.push(
      `${rel} ${subject} is hidden at rest and a :hover rule reveals it, but nothing ` +
        `reveals it on focus. A keyboard user tabs onto an invisible control, and if ` +
        `the hiding were visibility rather than opacity the control would not be in ` +
        `the tab order at all and would be unreachable rather than merely hidden`
    );
  }
}
failures.push(...hoverOnly);

/* ------------------ 2p. a row with no file to play has a disabled control
 *
 * TrackFileStatus carries four values that mean there is nothing on disk to
 * play: pending, downloading, failed and unavailable. Stored means there is, and
 * so does a removed TrackSourceStatus, because that track is still retained and
 * is the reason the row is dimmed rather than struck. Six of the sixteen rows in
 * the specimen are in the first group.
 *
 * A play control that is present and enabled on those rows is worse than no
 * control at all: it appears under the pointer, it takes the click, and it does
 * nothing, which is a mis-hit the user cannot explain. The lane is still
 * reserved on those rows, so the durations stay in one column; only the control
 * is inert.
 *
 * The wordless stored state is exempt by its own recorded decision in
 * STATE_WORDS, so the mapping here is the four words rather than all five.
 */
const UNPLAYABLE = new Set(['Pending', 'Downloading', 'Failed', 'Unavailable']);
const unplayable = [];
for (const file of specimens) {
  const rel = path.relative(designDir, file);
  const html = read(file);
  /* Scoped to the files that have the component, and the scoping matters: `.row`
     is a shared layout class, and the colour specimen has rows carrying the word
     "Pending" that are swatches and not tracks. A check that reached across every
       file with a `.row` fired on a track-state swatch, which is the check being
     wrong rather than the specimen. A row is a data row if it carries a
     duration, which is what a section heading does not.
     *
     * The guard is the morph's own class rather than the control's, because the
     * control was renamed mid-task and the guard silently stopped matching. The
     * check then passed on every file by skipping all of them, which is the
     * failure mode a scoping guard is least able to report: it looks exactly
     * like a clean run. */
  if (!html.includes('play__strip')) continue;
  for (const row of html.split(/<div class="row[ "]/).slice(1)) {
    if (!row.includes('class="dur')) continue;
    const words = [...row.matchAll(/>([A-Z][a-z]+(?:, [^<]*)?)</g)]
      .map(m => m[1].split(',')[0].trim())
      .filter(w => UNPLAYABLE.has(w));
    if (!words.length) continue;
    const control = row.match(/<button[^>]*class="play"[^>]*>/);
    if (!control) {
      unplayable.push(
        `${rel} a row in the state "${words[0]}" has no play control at all, so its ` +
          `lane is missing and the duration column shifts`
      );
      continue;
    }
    if (!/\bdisabled\b/.test(control[0])) {
      unplayable.push(
        `${rel} a row in the state "${words[0]}" has an enabled play control, and ` +
          `there is no file to play. It would take the click and do nothing`
      );
    }
  }
}
failures.push(...unplayable);

/* ------------------------- 2h. an icon-only control resets its padding
 *
 * A button carries a user-agent padding of 1px vertical and 6px horizontal, and
 * a control that centres a glyph with place-items does not notice, because
 * centring is relative to the content box and the content box is smaller than
 * the control. The track row's action lane measured it: a 16px icon in a 28px
 * control whose content box was 14.4px, so the icon overflowed and landed 0.8px
 * right of centre. The div version of the same class, with no UA padding, was
 * dead centre, which is what made it look like a glyph problem rather than a box
 * problem.
 *
 * Half a pixel of border is a small part of it and the icon size is the rest, so
 * the offset is not a fixed number to search for. What is fixed is the
 * relationship: a control that centres an icon has to say what its content box
 * is, and the only way to say that is to set the padding.
 *
 * This cannot be a computed check, because the validator reads files and does not
 * lay them out. So it checks the declaration instead, and names the control so
 * the failure points at a component rather than at a rule.
 */

const unresetControls = [];

/**
 * Which classes are used on a <button> somewhere in the tree. Read from the
 * markup rather than guessed from the CSS, because a class name carries no
 * information about the element it is written on: .lane is a button in the track
 * row and a div in the same file, one row over, and both are correct.
 */
const buttonClasses = (() => {
  const found = new Set();
  for (const file of specimens) {
    for (const m of read(file).matchAll(/<button\b([^>]*)>/g)) {
      for (const cls of (m[1].match(/class="([^"]+)"/) || [])[1]?.split(
        /\s+/
      ) ?? []) {
        if (cls) {
          found.add(cls);
        }
      }
    }
  }
  return found;
})();

/* A rule that centres its content and sizes itself, with no padding of its own.
   Both halves matter: a control with no declared size is laid out by its content
   and cannot drift, and a rule that does not centre cannot drift either. */
const centreRule =
  /(place-items|place-content|place-self)\s*:\s*center|align-items\s*:\s*center/;
// Any explicit width or height. Not only a token: .play sizes itself with 48px
// literals, and a check that only recognised var() would have missed the one
// control in the tree with a 48px box and the same unreset padding.
const sizedRule = /\b(width|height)\s*:\s*(var\(--|\d)/;

for (const file of specimens) {
  // Comments are stripped first, and that is not tidiness. The prose explaining
  // this fault names the declaration it is about, so an unstripped read finds a
  // padding that is not there and skips the rule it exists to catch. A check
  // that can be switched off by rewording a comment is not a check.
  const css = stripComments(read(file));
  const rel = path.relative(designDir, file);

  for (const block of cssRules(css)) {
    const selector = block.selector.split('\n').pop().trim();
    const body = block.body;

    if (!centreRule.test(body) || !sizedRule.test(body)) {
      continue;
    }
    if (/\bpadding\s*:/.test(body)) {
      continue;
    }
    // A descendant selector centres the child, not the control's own box.
    if (/[ >]/.test(selector.replace(/\.[a-z-]+/g, ''))) {
      continue;
    }
    // And it has to be a control the browser gives a user-agent padding to, which
    // means a <button>. The element is not named in the selector, it is named in
    // the markup, so the classes are read off the document rather than off the
    // rule. .sub and .meta centre text and are not buttons; .lane and .play are.
    // A container that happens to centre something is not what this is about.
    if (!buttonClasses.has(selector.replace(/^\./, '').split(/[.:\s]/)[0])) {
      continue;
    }

    unresetControls.push(
      `${rel} ${selector} centres an icon in a control it sizes, and sets no padding, ` +
        `so the control keeps the user-agent padding and the icon is centred in the ` +
        `content box rather than in the control. Set padding: 0 and measure the result.`
    );
  }
}

failures.push(...unresetControls);

/* ------------------------- 2g. no specimen types a glyph
 *
 * The track row shipped eleven vertical ellipses and three clockwise arrows as
 * numeric character references, U+22EE and U+21BB, as its only two marks. Nothing
 * caught it, because every rule about glyphs in this project was a sentence in a
 * document: ADR 0009 rules out a second typeface, ADR 0010 rules out an icon
 * font, and both of those exist to stop a mark being drawn by whatever font
 * happens to be installed. A typed glyph is that failure directly, and it is
 * invisible in a screenshot because the specimen renders in the family it was
 * measured in.
 *
 * So the rule is a check. The ranges are the ones that carry icon-like
 * characters rather than language: arrows, mathematical and technical symbols,
 * the miscellaneous symbols and dingbats blocks, and the supplemental block that
 * holds the emoji. Prose punctuation is not in any of them, which is why a
 * sentence can use an apostrophe or a dash and still pass.
 *
 * A character reference is caught as well as a literal, because that is how all
 * fourteen of them were written.
 */

const SYMBOL_RANGES = [
  [0x2190, 0x21ff, 'arrows'],
  [0x2200, 0x22ff, 'mathematical and technical symbols'],
  [0x2300, 0x27bf, 'miscellaneous symbols and dingbats'],
  [0x2b00, 0x2bff, 'supplemental symbols and emoji']
];

const inSymbolRange = cp =>
  SYMBOL_RANGES.find(([lo, hi]) => cp >= lo && cp <= hi);

const typedGlyphs = [];

for (const file of allHtml) {
  const html = read(file);
  const rel = path.relative(designDir, file);

  // A character reference, which is how every one of them was written, and a
  // bare character in the same ranges.
  for (const m of html.matchAll(
    /&#(\d+);|&#x([0-9a-fA-F]+);|([\u2190-\u2bff])/g
  )) {
    const cp = m[1]
      ? parseInt(m[1], 10)
      : m[2]
        ? parseInt(m[2], 16)
        : m[3].codePointAt(0);

    const range = inSymbolRange(cp);
    if (!range) {
      continue;
    }

    const line = html.slice(0, m.index).split('\n').length;
    typedGlyphs.push(
      `${rel}:${line}  U+${cp.toString(16).toUpperCase().padStart(4, '0')} ` +
        `(${range[2]}): a mark typed as a character is drawn by whatever font is installed. ` +
        `Use the pinned set; see docs/adr/0010-tabler-icons.md`
    );
  }
}

failures.push(...typedGlyphs);

/* ------------------------------- 3c. rejected candidates stay measured
 *
 * Every design decision in this system was made by computing ratios, and the
 * losing options are quoted in the documents as often as the winning ones. Those
 * numbers decay exactly like the others, so they are computed here from explicit
 * values rather than left as prose that nobody re-checks. Nothing here can fail:
 * these are values that were tried and ruled out, and their only job is to hold
 * a figure steady so a document can honestly say what the alternatives were.
 */

const CANDIDATES = [
  ['#4a5058', '--surface', 'the control border picked by eye, 2.21:1'],
  [
    '#4a5058',
    '--surface-raised',
    'the same, on the surface it was tightest on'
  ],
  ['#1a1e23', '--surface', 'a disabled fill that read as a hole, 1.07:1'],
  ['#22262e', '#888b8d', 'a lifted disabled fill, 4.42:1 for the label'],
  ['#262b33', '#888b8d', 'a lifted disabled fill, 4.15:1 for the label'],
  ['--surface-raised', '--bg', 'a segmented fill, 1.19:1'],
  [
    '#333941',
    '--muted',
    'the strongest dark segmented fill, 3.70:1 for the label'
  ],
  ['#424951', '--muted', 'a lighter segmented fill, 2.90:1 for the label'],
  [
    '#262b33',
    '--surface-raised',
    'the darkest end of that range, on the dialog fill'
  ],
  [
    '#424951',
    '--surface-raised',
    'the lightest end of that range, on the dialog fill'
  ],
  [
    '#ffffff',
    '#0b0d10',
    'the brightest a segmented thumb could go, if it had to be loud'
  ],
  // Why disabled is not --opacity-disabled. Both of these are a real token at
  // 0.45, and both come out under AA, which is the whole argument for the pair.
  [
    'rgba(230, 233, 234, 0.45)',
    '--surface',
    'ink at --opacity-disabled, under AA'
  ],
  [
    'rgba(139, 146, 153, 0.45)',
    '--surface',
    'muted at --opacity-disabled, under AA'
  ],
  // The disabled fill that was chosen, and the one beside it that reads as a hole.
  ['#1e2229', '--surface', 'the disabled fill that still reads as an object'],
  ['#1a1e23', '--surface', 'the disabled fill one step darker, a hole'],
  // A segmented fill inside the dialog, where the track is the dialog's own fill.
  [
    '--surface-raised',
    '--surface-raised',
    'a segmented fill against its own track'
  ],
  // The amber that was tried as a hover. It measures well, which is exactly why
  // it is worth recording: it passes every check and is still the wrong colour.
  [
    '--bg',
    '--tone-downloading',
    'the legend the amber hover would have carried'
  ],
  // A focused input's border, which replaced the outline ring.
  ['--accent', '--bg', 'a focused input border on the field fill'],
  [
    '--control-border',
    '--bg',
    'the same border unfocused, for the step between them'
  ]
];

const candidates = [];

for (const [fgRef, bgRef, note] of CANDIDATES) {
  const fg = parseColor(fgRef.startsWith('--') ? resolve(fgRef) : fgRef);
  const bg = parseColor(bgRef.startsWith('--') ? resolve(bgRef) : bgRef);

  if (!fg || !bg) {
    failures.push(
      `candidate names a value that does not parse: ${fgRef} on ${bgRef}`
    );
    continue;
  }

  candidates.push({
    ratio: contrastRatio(flatten(fg, bg), flatten(bg, bg)),
    note
  });
}

/* ------------------------------- 4. printed ratios on a specimen are correct
 *
 * A ratio written into a specimen is a claim that decays the moment a colour
 * changes. Every element carrying data-pair="<fg> on <bg>" is recomputed and its
 * printed number compared, so a stale figure is a build failure rather than
 * something a reader trusts.
 */

const staleRatios = [];

for (const file of specimens) {
  const lines = read(file).split('\n');
  lines.forEach((line, index) => {
    for (const match of line.matchAll(/data-pair="([^"]+)"[^>]*>([^<]*)</g)) {
      const [fgName, bgName] = match[1].split(' on ');
      const printed = match[2].trim();

      const fg = parseColor(resolve(fgName));
      const bg = parseColor(resolve(bgName));
      if (!fg || !bg) {
        continue;
      }

      const actual = contrastRatio(flatten(fg, bg), flatten(bg, bg)).toFixed(2);
      if (printed !== `${actual}:1`) {
        staleRatios.push({
          file: path.relative(designDir, file),
          line: index + 1,
          printed,
          actual,
          pair: match[1]
        });
      }
    }
  });
}

if (staleRatios.length) {
  failures.push(
    `specimens print a ratio that no longer matches the tokens, found ${staleRatios.length}:` +
      '\n' +
      staleRatios
        .map(
          s =>
            `   - ${s.file}:${s.line}  ${s.pair} prints ${s.printed}, should be ${s.actual}:1`
        )
        .join('\n')
  );
}

/* -------------------------------- 5. no specimen references a token that is gone
 *
 * Removing a token leaves every var(--that-token) behind resolving to nothing,
 * silently, and the page still looks plausible. This is the failure mode that
 * deleting --font-numeric introduced, so it is now checked rather than trusted.
 */

const dangling = [];
/* Every HTML file, including the opted-out ones. Opting out of the colour
   literal rule must not also exempt a file from the dangling reference check:
   a prototype declares a token in-page, and that is exactly the case worth
   catching, because the token will not exist once the prototype is deleted. */
/* tokens.css is a consumer of itself now that a token may be declared as
   another token, so an alias pointing at a name that does not exist is a
   dangling reference like any other. */
const consumers = [
  tokensPath,
  ...allHtml,
  path.join(designDir, 'specimen.css'),
  path.join(designDir, 'fonts.css')
];

for (const file of consumers) {
  if (!fs.existsSync(file)) {
    continue;
  }
  // Comments are stripped first. A token file that explains a mistake in prose
  // will quote the broken syntax while explaining it, and a reference inside a
  // comment is not a reference.
  stripComments(read(file))
    .split('\n')
    .forEach((line, index) => {
      for (const match of line.matchAll(/var\(\s*(--[a-zA-Z0-9_-]+)\s*[,)]/g)) {
        // A var() with a fallback cannot dangle: it resolves whether or not the
        // token exists, because the author wrote what to use instead. That is
        // the only exemption, and it is what lets a component declare a local
        // custom property for a value the token set has no business carrying.
        const hasFallback = match[0].trimEnd().endsWith(',');
        if (!tokens.has(match[1]) && !hasFallback) {
          dangling.push({
            file: path.relative(designDir, file),
            line: index + 1,
            token: match[1]
          });
        }
      }
    });
}

if (dangling.length) {
  failures.push(
    `a token is referenced but not defined in tokens.css, found ${dangling.length}:` +
      '\n' +
      dangling.map(d => `   - ${d.file}:${d.line}  var(${d.token})`).join('\n')
  );
}

/* ------------------------- 6. ratios quoted in the design docs are still real
 *
 * The specimens are guarded by check 4, but the decision record in docs/ is what
 * a reader is told to read first, so a stale ratio in it is the most expensive
 * kind of drift. Every "N:1" figure it quotes must be a ratio the current tokens
 * actually produce.
 *
 * The record is a directory rather than one file. DESIGN.md is the index and
 * holds the cross-cutting rules; docs/design-system/ holds one file per subject.
 * This check reads the whole set, because the alternative is a check that guards
 * the index and quietly stops guarding the fourteen files that hold almost every
 * ratio in the corpus. A check that has been narrowed to the one file that
 * happens to be small enough to look at is a check with nothing to check.
 *
 * The attribution rule below is applied per figure across the set, not per file,
 * so a figure declared once with the colour it was measured against is still
 * quotable bare in a sibling file. Splitting the record must not split the rule
 * with it: a reader who finds "1.60:1" in the player bar and its hex in the
 * equalizer strip is being told the same thing as one who finds both in a
 * paragraph.
 */

/* docsDir is declared once, at the link walk above, which runs first. Two
 * declarations of the same path is a redeclaration error rather than a
 * duplicate, so the second one is gone rather than renamed. */
const designDoc = path.join(docsDir, 'DESIGN.md');
const designSystemDir = path.join(docsDir, 'design-system');
/* Every markdown file the record is made of, index first so a duplicate figure is
 * attributed from the earliest mention, which is the one a reader reaches first. */
const designDocs = [
  designDoc,
  ...(fs.existsSync(designSystemDir)
    ? fs
        .readdirSync(designSystemDir, { recursive: true, withFileTypes: true })
        .filter(e => e.isFile() && e.name.endsWith('.md'))
        .map(e => path.join(e.parentPath, e.name))
        .sort()
    : [])
];
const computedRatios = new Set([
  ...measured.map(m => m.ratio.toFixed(2)),
  ...boundaries.map(b => b.ratio.toFixed(2)),
  ...candidates.map(c => c.ratio.toFixed(2))
]);
const designProblems = [];
/* Ratios admitted by the attribution rule below rather than by the token set.
   Collected here so the summary can report them, because an exemption that
   nobody can see is an exemption that grows. */
const offTokenRatios = [];

if (designDocs.length) {
  const quoted = new Set();
  for (const doc of designDocs) {
    for (const match of read(doc).matchAll(/(\d+\.\d+):1/g)) {
      quoted.add(match[1]);
    }
  }
  // The AA and non-text thresholds are policy declared in this file rather than
  // measurements of the tokens, so a document is allowed to name them.
  const thresholds = new Set([String(AA), String(NON_TEXT)]);
  /*
   * A figure the tokens cannot produce is still allowed, provided the sentence
   * naming it also names the colour it was measured against, as a hex literal.
   *
   * This is a stricter rule than the one it replaces, not a looser one. A bare
   * unattributed number still fails exactly as before, and what the attribution
   * buys is that a figure measured against something outside the token system
   * has to say what that something is. The alternative was to keep the rule and
   * lose the figures, or to keep the figures and dodge the notation, and both
   * of those put a real number somewhere a reader would not look.
   *
   * It is here because of one case. The equalizer bars draw --accent straight
   * onto coverUrl, which is an arbitrary photograph, so those bars measure
   * 5.23:1 on a dark cover and 1.60:1 on a mid grey. Those are the most
   * load-bearing numbers in the whole decision, because they are the price of
   * dropping the scrim, and they belong in the document a reader is told to read
   * first. Neither colour is a token, so no token can move them and they cannot
   * go stale the way a token pairing can.
   *
   * The attribution is per value rather than per occurrence, and that is
   * deliberate. Once a figure has declared what it was measured against its
   * meaning is fixed, and every later mention of the same number inherits that
   * meaning. The alternative is to demand the hex at every mention, which would
   * push "1.60:1" out of the sentences that discuss it and into a parenthetical,
   * for no safety the first declaration was not already providing. A figure can
   * therefore be quoted bare later in the document; it cannot be quoted bare
   * anywhere until it has been attributed once, which is what a figure invented
   * out of nothing cannot do.
   */
  /* Every file concatenated, because attribution is per value across the set. The
     order is the one designDocs is built in, index first. */
  const doc = designDocs.map(read).join('\n\n');
  /* Which file each figure was first declared in, so a failure can name the file
     a reader has to open rather than only the number. Without it the report says
     a figure is wrong and leaves the reader to grep fifteen files for it. */
  const firstSeenIn = new Map();

  for (const file of designDocs) {
    for (const match of read(file).matchAll(/(\d+\.\d+):1/g)) {
      if (!firstSeenIn.has(match[1])) {
        firstSeenIn.set(match[1], file);
      }
    }
  }

  for (const value of quoted) {
    if (computedRatios.has(value) || thresholds.has(value)) continue;
    /* [.] rather than \. on purpose. A backslash inside a template literal is
       eaten before the RegExp ever sees it, which turns the sentence terminator
       into a wildcard and truncates every sentence to a few characters: the
       first version of this rule reported three attributed figures as
       unattributed for exactly that reason, and reported them wrongly. A
       character class needs no escape and cannot be mangled that way. */
    const sentences = [
      ...doc.matchAll(
        new RegExp(`[^.]*?${value.replace('.', '[.]')}:1[^.]*?[.]`, 'g')
      )
    ].map(m => m[0]);
    if (sentences.some(sent => /#[0-9a-fA-F]{3,8}\b/.test(sent))) {
      offTokenRatios.push(value);
    } else {
      designProblems.push(
        `${value} in ${path.relative(docsDir, firstSeenIn.get(value))}`
      );
    }
  }
  if (designProblems.length) {
    failures.push(
      `the design record quotes ${designProblems.length} contrast ratio(s) the tokens no longer produce: ` +
        designProblems.join(', ')
    );
  }
}

const CHECK_COUNT = [
  ...read(__filename).matchAll(/^ *\/\* -+ [0-9]+[a-z]?\./gm)
].length;

/* -------------------------------------------------------------------- report */

/* The same rule the boundary report already follows: a FORBIDDEN entry is below
   threshold on purpose, so naming it as the tightest pairing to watch tells a
   reader to guard a value the system has already ruled out. The tightest figure
   is the one that would fail first if a token moved. */
const liveText = measured.filter(m => !m.note.startsWith('FORBIDDEN'));
const tightest = liveText.reduce(
  (w, m) => (m.ratio < w.ratio ? m : w),
  liveText[0]
);
/* A FORBIDDEN entry is below threshold on purpose, so it must not be reported
   as the tightest real pairing. Naming a value the system has ruled out as the
   one to watch is how a number stops meaning anything. */
const liveBoundaries = boundaries.filter(b => !b.note.startsWith('FORBIDDEN'));
const tightestBoundary = liveBoundaries.reduce(
  (w, b) => (b.ratio < w.ratio ? b : w),
  liveBoundaries[0]
);

console.log(`tokens     ${tokens.size} values in tokens.css`);
console.log(
  `glyphs     ${typedGlyphs.length} typed as characters, ${iconsUsed.size} from the pinned set, ` +
    `${unresetControls.length} icon controls with an unreset padding`
);
console.log(
  `icons      ${iconsUsed.size} of ${Object.keys(PINNED_ICONS).length} pinned glyphs used, ` +
    `pin @tabler/icons ${ICON_VERSION}, ${iconProblems.length} provenance problems, ` +
    `${morphPathCount} computed frame paths declared by a morph`
);
const undeclared = generatedDeclarations.filter(g =>
  g.includes('does not declare')
);
console.log(
  `morph      ${morphReport}` +
    (morphProblems.length ? `, ${morphProblems.length} problems` : '')
);
for (const m of morphProblems) {
  console.log(`  - ${m}`);
}
console.log(
  `generated  ${generatedDeclarations.length - undeclared.length} prototype files declaring ` +
    `computed geometry, ${undeclared.length} undeclared` +
    (generatedDeclarations.length
      ? `: ${generatedDeclarations.map(g => path.basename(g)).join(', ')}`
      : '')
);
for (const g of undeclared) {
  console.log(`  - ${g}`);
}
console.log(
  `specimens  ${allHtml.length} HTML files, ${literals.length} raw colour literals, ` +
    `${staleRatios.length} stale ratios, ${dangling.length} dangling tokens, ` +
    `${toneHovers.length} tone hovers, ${aliased.length} aliased tokens, ` +
    `${stateProblems.length} state words, ${deadLinks.length} dead links` +
    (optedOutFiles.length ? `, ${optedOutFiles.length} opted out` : '') +
    (offTokenRatios.length
      ? `, ${offTokenRatios.length} off-token ratios attributed by hex (${offTokenRatios.join(' ')})`
      : '')
);
const readme = path.join(designDir, 'README.md');
if (fs.existsSync(readme)) {
  const words = {
    seventeen: 17,
    eighteen: 18,
    nineteen: 19,
    twenty: 20,
    'twenty-one': 21,
    'twenty-two': 22,
    'twenty-three': 23
  };
  const all = [
    ...read(readme).matchAll(/validate-design-tokens\.cjs +([a-z-]+) +checks/g)
  ];
  const stated = all.length === 1 ? all[0] : null;
  const parsed = stated ? words[stated[1]] : undefined;
  if (!parsed) {
    failures.push(
      `docs/design/README.md states the check count ${
        all.length === 0
          ? 'nowhere'
          : `in ${all.length} places, so there is no single ` +
            'number to keep honest'
      }, and the script cannot read it`
    );
  } else if (parsed !== CHECK_COUNT) {
    failures.push(
      `docs/design/README.md says the validator has ${parsed} checks and it has ` +
        `${CHECK_COUNT}. A list that claims a length other than its own is a list ` +
        `nobody can trust`
    );
  }
}

const ruledOutText = measured.length - liveText.length;
console.log(
  `contrast   ${liveText.length} pairings at 4.5:1, tightest ${tightest.fgName} on ` +
    `${tightest.bgName} at ${tightest.ratio.toFixed(2)}:1` +
    (ruledOutText ? `, ${ruledOutText} ruled out` : '')
);
const ruledOut = boundaries.length - liveBoundaries.length;
const candidatesStr = candidates.map(c => `${c.ratio.toFixed(2)}:1`).join(' ');
console.log(
  `boundaries ${liveBoundaries.length} control edges at 3:1, tightest ${tightestBoundary.fgName} ` +
    `on ${tightestBoundary.bgName} at ${tightestBoundary.ratio.toFixed(2)}:1` +
    (ruledOut ? `, ${ruledOut} ruled out` : '')
);
console.log(
  `history    ${candidates.length} rejected candidates held at ${candidatesStr}`
);

if (failures.length) {
  console.error(`\nFAIL ${failures.length} problem(s)\n`);
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}

console.log('\nOK');
