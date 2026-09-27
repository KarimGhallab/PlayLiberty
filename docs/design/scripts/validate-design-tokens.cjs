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

const designDir = path.resolve(__dirname, '..');
const tokensPath = path.join(designDir, 'tokens.css');
const failures = [];

/* ------------------------------------------------------------------ helpers */

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

for (const file of allHtml) {
  for (const match of read(file).matchAll(/href="([^"]+)"/g)) {
    const href = match[1];

    // Only local relative paths are checkable. A fragment, a scheme and a
    // protocol-relative URL are all somebody else's problem.
    if (/^(#|[a-z]+:|\/\/)/i.test(href)) continue;

    const target = path.resolve(path.dirname(file), href.split('#')[0]);
    const key = `${file} -> ${href}`;

    if (seenLinks.has(key)) continue;
    seenLinks.add(key);

    if (!fs.existsSync(target)) {
      deadLinks.push(
        `${path.relative(designDir, file)} links to ${href}, which does not exist`
      );
    }
  }
}

failures.push(...deadLinks);

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
      for (const match of line.matchAll(/var\(\s*(--[a-zA-Z0-9_-]+)/g)) {
        if (!tokens.has(match[1])) {
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

/* ------------------------- 6. ratios quoted in DESIGN.md are still real
 *
 * The specimens are guarded by check 4, but docs/DESIGN.md is the document a
 * reader is told to read first, so a stale ratio in it is the most expensive
 * kind of drift. Every "N:1" figure it quotes must be a ratio the current tokens
 * actually produce.
 */

const designDoc = path.resolve(designDir, '..', 'DESIGN.md');
const computedRatios = new Set([
  ...measured.map(m => m.ratio.toFixed(2)),
  ...boundaries.map(b => b.ratio.toFixed(2)),
  ...candidates.map(c => c.ratio.toFixed(2))
]);
const designProblems = [];

if (fs.existsSync(designDoc)) {
  const quoted = new Set();
  for (const match of read(designDoc).matchAll(/(\d+\.\d+):1/g)) {
    quoted.add(match[1]);
  }
  // The AA and non-text thresholds are policy declared in this file rather than
  // measurements of the tokens, so a document is allowed to name them.
  const thresholds = new Set([String(AA), String(NON_TEXT)]);
  for (const value of quoted) {
    if (!computedRatios.has(value) && !thresholds.has(value)) {
      designProblems.push(value);
    }
  }
  if (designProblems.length) {
    failures.push(
      `docs/DESIGN.md quotes ${designProblems.length} contrast ratio(s) the tokens no longer produce: ` +
        designProblems.join(', ')
    );
  }
}

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
  `specimens  ${allHtml.length} HTML files, ${literals.length} raw colour literals, ` +
    `${staleRatios.length} stale ratios, ${dangling.length} dangling tokens, ` +
    `${toneHovers.length} tone hovers, ${deadLinks.length} dead links` +
    (optedOutFiles.length ? `, ${optedOutFiles.length} opted out` : '')
);
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
