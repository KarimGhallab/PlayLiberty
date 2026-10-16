/**
 * The play to pause morph.
 *
 * The design record takes glyph geometry from a pinned icon set so the two clients draw
 * the same shape. This file is the amendment to that, and it is narrow on
 * purpose: the two ENDPOINTS are still the pinned glyphs, verbatim, and only
 * the shapes in between are computed. A control that rests is a pinned glyph; a
 * control that is changing is this table.
 *
 * Nothing here is hand-placed. The outlines are the pinned paths' own on-curve
 * points in the pinned paths' own order, resampled to a common vertex count, and
 * interpolated point for point. Change an endpoint and the whole table moves
 * with it, and scripts/build-morph-frames.mjs prints the specimen's markup from
 * this module so the markup in the HTML is never typed by hand.
 *
 * Three things about the geometry are worth knowing before changing anything,
 * and each was measured rather than reasoned about.
 *
 * 1. The play triangle is not a filleted triangle. Tabler filled the pause bars
 *    properly, each corner a real fillet tangent to both edges. It did not do
 *    that for the play triangle: its three r 1 arcs are chamfers, and at the top
 *    left corner the arc runs from (7.524, 3.148) to (6, 4) while the sharp
 *    corner it is cutting sits at (6, 2.012), so the arc overshoots by about half
 *    a unit. The glyph's ink is 154 square units where a clean fillet of the
 *    same triangle is 143.
 *
 * 2. A straight edge cannot become a fillet by growing a radius on a fixed
 *    chord. The arc is invalid until the radius reaches half the chord, and at
 *    half the chord it is a semicircle, so the edge bulges instead of squaring
 *    off. Clamping the radius does not help; it moves where the bulge appears.
 *    That is why this is a resample-and-interpolate and not a set of polygons
 *    carrying corner radii.
 *
 * 3. A linearly interpolated polygon has an area that is quadratic in t, not
 *    linear, so the area sags before it climbs. A monotonic-area rule flags a
 *    1.4% sag, which spread along the outline is under a twentieth of a pixel at
 *    28px. The rule that ships is a ceiling on the sag, not a demand for a
 *    straight line, and the ceiling is set to catch a real pinch. One was caught:
 *    built with the arc centre on the wrong side and the rotation running the
 *    wrong way, every corner bowed inwards, the pause bars measured 25.8% ink
 *    against the pinned 32.2% and the area fell 35% at the midpoint. The
 *    bounding box was within 0.05 units the whole time, because the straight
 *    edges set the box and the corners do not touch it. Ink area catches this
 *    class of fault. A box does not.
 *
 * The optical correction is baked into the play endpoint here rather than applied
 * by the stylesheet, because every frame has to share one coordinate system or
 * the shape drifts. It is the same number the validator holds in PINNED_OPTICAL,
 * and it is applied to the play points alone: nudging the pause end too slides
 * the far end of the morph 1.5 units left, which is most of a unit of centre
 * travel and reads as a glyph wandering while it changes.
 */

/* The two endpoints, transcribed from the pin at @tabler/icons 3.48.0. */
export const PINNED = {
  play: [
    'M6 4v16a1 1 0 0 0 1.524 .852l13 -8a1 1 0 0 0 0 -1.704l-13 -8a1 1 0 0 0 -1.524 .852z'
  ],
  pause: [
    'M9 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z',
    'M17 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z'
  ]
};

export const PIN_VERSION = '3.48.0';

/* The icon each endpoint is a copy of, for the provenance check. */
export const ENDPOINT_ICONS = {
  play: 'player-play-filled',
  pause: 'player-pause-filled'
};

/*
 * The optical offset the pinned set leaves on the play glyph. Its ink centres at
 * x 13.47 in a box centred at 12, so it sits 1.5 units right of centre, which
 * is 1.75px at --icon-lg and reads as a triangle pushed to the right of a round
 * button. Same number as PINNED_OPTICAL in the validator.
 */
export const OPTICAL_X = -1.5;

export const MORPH = {
  name: 'play-pause',
  /* Eight frames over --motion-base. The count is not measured: the centre drift
     and the gap between the pieces come out the same to two decimals at 8, 11
     and 16, so the count is a choice and 8 is the cheapest one that still reads
     as a shape changing rather than a cross-fade. */
  frames: 8,
  duration: 'var(--motion-base)',
  /* The area may sag this far below its starting value, in percent. Chosen to
     sit far above the measured 1.4% sag and far below the 35% pinch it exists
     to catch. */
  areaDipCeiling: 3
};

const PLAY_PTS = {
  A: [6, 4],
  B: [6, 20],
  C: [7.524, 20.852],
  D: [20.524, 12.852],
  E: [20.524, 11.148],
  F: [7.524, 3.148]
};

/* Where the play triangle is cut in two. The cut is vertical, so the two pieces
   share that edge and the shape is one piece at frame 0, which is what the gap
   measurement asserts. */
const SPLIT = 12;

const lerp = (a, b, t) => a + (b - a) * t;
const lerpPt = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const nudge = p => [p[0] + OPTICAL_X, p[1]];

/** Where the two cut edges cross x = SPLIT. */
const cut = (a, b) => {
  const t = (SPLIT - a[0]) / (b[0] - a[0]);
  return [SPLIT, a[1] + t * (b[1] - a[1])];
};

const S_BOT = cut(PLAY_PTS.C, PLAY_PTS.D);
const S_TOP = cut(PLAY_PTS.E, PLAY_PTS.F);

/**
 * A point a fraction t along an edge. An edge is { to, r }: r 0 is a straight
 * line, r above 0 is a circular arc from the current point to `to`.
 *
 * The two sign conventions are pinned down here, because the box figures do not
 * show either. The centre goes opposite the direction
 * of travel, which for a fillet is what puts it on the inside of the corner:
 * the pause bar's bottom right fillet, (9,20) to (11,18) at r 2, has its centre
 * at (9,18), and the other sign puts it at (11,20), which is the corner itself.
 * And the angle decreases as the point advances, because going from a vector at
 * 146 degrees to one at 33 degrees is a fall, not a rise.
 */
export function edgePoint(from, e, t) {
  if (t <= 0) {
    return from;
  }
  if (t >= 1) {
    return e.to;
  }
  if (e.r <= 0) {
    return [
      from[0] + (e.to[0] - from[0]) * t,
      from[1] + (e.to[1] - from[1]) * t
    ];
  }
  const dx = e.to[0] - from[0];
  const dy = e.to[1] - from[1];
  const chord = Math.hypot(dx, dy);
  const sweep = 2 * Math.asin(Math.min(1, chord / (2 * e.r)));
  const half = Math.sqrt(Math.max(0, e.r * e.r - (chord / 2) ** 2));
  const ux = dx / chord;
  const uy = dy / chord;
  const cx = (from[0] + e.to[0]) / 2 + uy * half;
  const cy = (from[1] + e.to[1]) / 2 - ux * half;
  const vx = from[0] - cx;
  const vy = from[1] - cy;
  const a = -sweep * t;
  return [
    cx + vx * Math.cos(a) - vy * Math.sin(a),
    cy + vx * Math.sin(a) + vy * Math.cos(a)
  ];
}

function edgeLength(from, e) {
  if (e.r <= 0) {
    return Math.hypot(e.to[0] - from[0], e.to[1] - from[1]);
  }
  return (
    e.r *
    2 *
    Math.asin(
      Math.min(1, Math.hypot(e.to[0] - from[0], e.to[1] - from[1]) / (2 * e.r))
    )
  );
}

/*
 * Walk an outline and return N points. Every arc keeps at least three, so a
 * fillet still reads as a fillet rather than a chamfer, and the leftover points
 * go into the straight edges in proportion to their length, where an extra
 * vertex costs nothing because it is collinear.
 *
 * N is derived, not chosen. Both endpoints have to resample to the same count,
 * so N is the largest any of the four outlines needs, and a hand-picked number
 * that happens to match today fails silently the day an endpoint moves. The
 * pause bars are the demanding side and they set it: four fillets at three
 * points each, plus four straight edges, plus the start.
 */
const outlineMin = o => 1 + o.edges.reduce((s, e) => s + (e.r > 0 ? 3 : 1), 0);

export const VERTEX_COUNT = Math.max(
  ...Object.values(playOutlines()).map(outlineMin),
  ...Object.values(pauseOutlines()).map(outlineMin)
);

function flatten(start, edges) {
  const at = [start];
  let cur = start;
  const lens = edges.map(e => {
    const l = edgeLength(cur, e);
    cur = e.to;
    return l;
  });
  const alloc = edges.map(e => (e.r > 0 ? 3 : 1));
  let left = VERTEX_COUNT - 1 - alloc.reduce((a, b) => a + b, 0);
  const straight = edges.map((e, i) => (e.r > 0 ? -1 : i)).filter(i => i >= 0);
  const span = straight.reduce((sum, i) => sum + lens[i], 0);
  if (left < 0) {
    throw new Error(
      `flatten: ${VERTEX_COUNT} vertices is fewer than this outline needs, ` +
        `${1 + alloc.reduce((a, b) => a + b, 0)}`
    );
  }
  if (left > 0 && span > 0) {
    const share = straight.map(i => (left * lens[i]) / span);
    const whole = share.map(v => Math.floor(v));
    let placed = whole.reduce((a, b) => a + b, 0);
    straight.forEach((i, k) => {
      alloc[i] += whole[k];
    });
    // Largest remainder first, so the count lands exactly on VERTEX_COUNT rather
    // than a few points short of it. An earlier version handed each straight
    // edge at most one spare point and came out three vertices short, which
    // truncated the pause bar to the play wedge's length during interpolation.
    straight
      .map((i, k) => ({ i, frac: share[k] - whole[k] }))
      .sort((a, b) => b.frac - a.frac)
      .forEach(({ i }) => {
        if (placed >= left) {
          return;
        }
        alloc[i] += 1;
        placed += 1;
      });
  }
  cur = start;
  edges.forEach((e, i) => {
    const seg = alloc[i];
    for (let k = 1; k <= seg; k++) {
      at.push(edgePoint(cur, e, k / seg));
    }
    cur = e.to;
  });
  return at;
}

/*
 * The play triangle, cut in two at x 12. The left piece keeps its 6 unit width
 * and only squares off. The right piece opens from a 1.7 unit sliver at the apex
 * into a full bar. That asymmetry is the whole effect.
 */
function playOutlines() {
  return {
    left: {
      start: PLAY_PTS.A,
      edges: [
        { to: PLAY_PTS.B, r: 0 },
        { to: PLAY_PTS.C, r: 1 },
        { to: S_BOT, r: 0 },
        { to: S_TOP, r: 0 },
        { to: PLAY_PTS.F, r: 0 },
        { to: PLAY_PTS.A, r: 1 }
      ]
    },
    right: {
      start: S_BOT,
      edges: [
        { to: PLAY_PTS.D, r: 0 },
        { to: PLAY_PTS.E, r: 1 },
        { to: S_TOP, r: 0 },
        { to: S_BOT, r: 0 }
      ]
    }
  };
}

/*
 * The pause bars, x 5..11 and 13..19, y 4..20, from the pinned path's own
 * on-curve points, which for a filleted bar are its tangent points. Both
 * outlines start at the top left corner region and run the same way round as
 * the play pieces, so vertex i means the same thing on both sides.
 */
function pauseOutlines() {
  return {
    left: {
      start: [7, 4],
      edges: [
        { to: [5, 6], r: 2 },
        { to: [5, 18], r: 0 },
        { to: [7, 20], r: 2 },
        { to: [9, 20], r: 0 },
        { to: [11, 18], r: 2 },
        { to: [11, 6], r: 0 },
        { to: [9, 4], r: 2 },
        { to: [7, 4], r: 0 }
      ]
    },
    right: {
      start: [13, 18],
      edges: [
        { to: [15, 20], r: 2 },
        { to: [17, 20], r: 0 },
        { to: [19, 18], r: 2 },
        { to: [19, 6], r: 0 },
        { to: [17, 4], r: 2 },
        { to: [15, 4], r: 0 },
        { to: [13, 6], r: 2 },
        { to: [13, 18], r: 0 }
      ]
    }
  };
}

const playPieces = () => {
  const o = playOutlines();
  return {
    left: flatten(o.left.start, o.left.edges).map(nudge),
    right: flatten(o.right.start, o.right.edges).map(nudge)
  };
};

const pausePieces = () => {
  const o = pauseOutlines();
  return {
    left: flatten(o.left.start, o.left.edges),
    right: flatten(o.right.start, o.right.edges)
  };
};

const lerpPts = (a, b, t) => a.map((p, i) => lerpPt(p, b[i], t));

const polyPath = pts =>
  'M' +
  pts.map(p => `${(+p[0]).toFixed(3)} ${(+p[1]).toFixed(3)}`).join('L') +
  'Z';

/**
 * The frame table. The first and last frames are the pinned path data itself,
 * so a control at rest is the artwork the clients draw and not an approximation
 * of it. Only the frames between are reconstructed.
 *
 * @param {number} count frames, endpoints included
 * @returns {{index: number, t: number, exact: boolean, paths: string[] }[]}
 */
export function buildFrames(count = MORPH.frames) {
  const from = playPieces();
  const to = pausePieces();
  const out = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    if (i === 0) {
      out.push({ index: i, t, exact: true, paths: PINNED.play });
    } else if (i === count - 1) {
      out.push({ index: i, t, exact: true, paths: PINNED.pause });
    } else {
      out.push({
        index: i,
        t,
        exact: false,
        paths: [
          polyPath(lerpPts(from.left, to.left, t)),
          polyPath(lerpPts(from.right, to.right, t))
        ]
      });
    }
  }
  return out;
}

/**
 * What the table measures, per frame. Taken from the polygons rather than the
 * path strings, because a path cannot be read back for a box.
 *
 * `gap` is the horizontal distance between the two pieces' facing edges. They
 * share the cut line at the first frame, so it opens from zero and must never
 * close past it: the same failure the shuffle prototype spent its life on, where
 * two heads were meant to be separate and were not.
 */
export function measure(count = MORPH.frames) {
  const from = playPieces();
  const to = pausePieces();
  const area = poly =>
    Math.abs(
      poly.reduce((s, p, k) => {
        const q = poly[(k + 1) % poly.length];
        return s + p[0] * q[1] - q[0] * p[1];
      }, 0) / 2
    );
  const rows = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const L = lerpPts(from.left, to.left, t);
    const R = lerpPts(from.right, to.right, t);
    const xs = [...L, ...R].map(q => q[0]);
    const ys = [...L, ...R].map(q => q[1]);
    rows.push({
      index: i,
      t,
      exact: i === 0 || i === count - 1,
      cx: (Math.min(...xs) + Math.max(...xs)) / 2,
      cy: (Math.min(...ys) + Math.max(...ys)) / 2,
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys),
      gap: Math.min(...R.map(q => q[0])) - Math.max(...L.map(q => q[0])),
      area: area(L) + area(R)
    });
  }
  return rows;
}

/** The invariants the table has to hold, and the figures behind them. */
export function invariants(count = MORPH.frames) {
  const rows = measure(count);
  const drift = Math.max(
    ...rows.map(r => Math.hypot(r.cx - rows[0].cx, r.cy - rows[0].cy))
  );
  let gapOpens = true;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].gap < rows[i - 1].gap - 1e-9) {
      gapOpens = false;
    }
  }
  const start = rows[0].area;
  return {
    count,
    centreDrift: drift,
    minGap: Math.min(...rows.map(r => r.gap)),
    maxGap: Math.max(...rows.map(r => r.gap)),
    gapOpens,
    areaRise: (rows[rows.length - 1].area / start - 1) * 100,
    areaDip: Math.max(...rows.map(r => ((start - r.area) / start) * 100))
  };
}

/* ------------------------------------------------------- specimen emission */

/*
 * The frames ship as a strip, not as a stack of symbols.
 *
 * A stack needs a window per element: lit for its own slice, dark either side.
 * CSS cannot express that with a timing function, because steps() can only
 * quantise one ramp and a window is not a ramp. The usual workaround, two
 * keyframe legs meeting at a shared offset, does not work either: the last
 * declaration at an offset wins, so the leg before it is no longer held and the
 * element cross-fades up over its whole run. An earlier version of the
 * prototype did exactly that and called the result stepped. The epsilon that
 * would fix it, one hundredth of a percent, is a workaround for a shape the
 * mechanism does not have.
 *
 * A strip sidesteps all of it. The eight frames sit side by side in one group,
 * the element's own box clips to one of them, and a single transform steps
 * across the row. Now there is one ramp, so steps() is the right primitive and
 * is load-bearing: steps(7, jump-end) is what puts the element on frame 0, then
 * on each of the next six, and leaves it on frame 7, with no tweening between
 * any of them and nothing to undo afterwards.
 *
 * jump-end, and not the jump-none that reads more like "every position counts".
 * Measured, over the 168 unit travel: jump-end gives seven intervals of 24, one
 * per frame, landing on 0, -24, -48, -72, -96, -120, -144, -168. jump-none gives
 * six intervals of 28, so the strip rests between two frames for a quarter of
 * each step and never lands on one. Neither the box nor the endpoints show it;
 * only the rendered positions do.
 */

/** The strip's travel, in the 24 unit grid. Seven steps of one frame width. */
export const STRIP_TRAVEL = -(MORPH.frames - 1) * 24;

/**
 * Where a frame's group sits.
 *
 * Frame 0 is the pinned play path, verbatim, and verbatim means un-nudged: the
 * optical correction lives in the interpolated frames' points, so the first
 * frame needs it as a group offset or the strip jumps 1.5 units on its first
 * step. Every other frame is either interpolated, with the correction already in
 * its points, or the pinned pause path, which Tabler centres on its own box and
 * must not be nudged at all.
 */
export function frameOffset(index) {
  return index * 24 + (index === 0 ? OPTICAL_X : 0);
}

/**
 * The markup for the strip, as the specimen's <svg> holds it.
 *
 * The eight frame groups and NOT the <g class="play__strip"> around them. That
 * wrapper is one line of hand-written markup in every specimen that has the
 * control, and the omission is deliberate here because the wrapper is not part
 * of the computed geometry: it is the element the CSS moves.
 *
 * Leaving it out is a silent fault, and a silent one. Every rule that positions
 * the strip addresses .play__strip, so a strip pasted without the wrapper is
 * addressed by nothing, sits at translateX(0) whatever the state says, and draws
 * frame 0 forever. On a playing button that is the play triangle where the pause
 * bars belong, and because .play__glyph clips, the eight frames look exactly
 * like a correct resting glyph rather than like eight frames. Pasting this
 * function's output into an <svg> is therefore not enough: the caller has to
 * open the wrapper.
 */
export function stripBlock(count = MORPH.frames, indent = '              ') {
  return buildFrames(count)
    .map(f => {
      const paths = f.paths
        .map(d => `${indent}    <path d="${d}" />`)
        .join('\n');
      return (
        `${indent}  <g transform="translate(${frameOffset(f.index)} 0)">\n` +
        `${paths}\n` +
        `${indent}  </g>`
      );
    })
    .join('\n');
}

/** The frame table as a JSON array, for packages/tokens to transcribe. */
export function frameJson(count = MORPH.frames) {
  return {
    name: MORPH.name,
    frames: count,
    duration: MORPH.duration,
    pin: `@tabler/icons ${PIN_VERSION}`,
    endpoints: ENDPOINT_ICONS,
    stripTravel: STRIP_TRAVEL,
    table: buildFrames(count).map(f => ({
      index: f.index,
      exact: f.exact,
      paths: f.paths
    }))
  };
}

/**
 * The CSS, as the specimen's <style> holds it. The numbers in it are derived,
 * so changing the frame count changes the step count and the travel with it.
 *
 * The animation is paused until a control asks for it, because an animation bound
 * to a rule runs the moment the rule applies: a play button that mounts showing
 * play would otherwise spend its first 180ms morphing to pause and rest there
 * against its own label.
 *
 * The resting transform is a state rule, and the animation is attached by a
 * second attribute rather than always being present. Both halves matter.
 *
 * An animation that is merely paused still applies its keyframe value, and an
 * animation beats a plain declaration, so a strip carrying the animation and
 * paused at zero sits on frame 0 whatever the state says. Every button showed
 * the triangle that way, including the one labelled pause. Attaching the
 * animation only while a transition is running leaves the state rule in charge
 * of rest.
 *
 * The client sets data-state and data-run together, then drops data-run when the
 * transition ends. The animation's end value is the same number the state rule
 * holds, so dropping it does not move the glyph, and a reader who asked for no
 * motion never had the animation at all.
 * data-state lives on the header, not on the button, and that moved here rather
 * than being worked around. The cover carries an equalizer strip that appears
 * only while a playlist is playing, the cover is the button's sibling, and CSS
 * cannot reach a sibling from a button. So the state is a fact about the
 * playlist and both the button and the cover are expressions of it.
 *
 * The values moved with it, from "play" and "pause" to "playing" and "paused",
 * and that was not optional. On a button, data-state="pause" names the glyph
 * that rests, which is honest: the button will pause. The same value on a header
 * would mean the playlist is paused, which is the opposite, and the next reader
 * gets it backwards. A state attribute has to name the state.
 *
 * The track row carries the same attribute and uses the same control, so the
 * resting-frame rule is emitted once per host rather than once per specimen. It
 * is one declaration with a selector list, so the copies of this block that live
 * in the specimens stay byte-identical and check 2j compares the same string
 * against every one of them.
 *
 * A host is a list because each specimen is written by hand and a block that
 * listed only the host in that file would be a different block in every file.
 * Every specimen therefore carries the whole list, including hosts it does not
 * contain, and `bar` is in it from the player bar prototype onwards: the bar's
 * play is the header's control, the bar carries data-state for the same reason
 * the header does, and the block could not be verified at all if the selector
 * had to be added by hand. The alternative was a fourth hand-written copy of
 * the travel beside the generated one, and a computed number restated by hand
 * is the exact failure this block exists to prevent. `thdr` joined the list with
 * the tile, the library's item, whose play is this same control.
 */
export const MORPH_HOSTS = ['hdr', 'mhdr', 'thdr', 'row', 'bar'];

export function styleBlock(count = MORPH.frames, hosts = MORPH_HOSTS) {
  const travel = -(count - 1) * 24;
  const name = `pl-${MORPH.name}`;
  const resting = hosts
    .map(h => `.${h}[data-state='playing'] .play__strip`)
    .join(',\n      ');
  return `/* The strip. All ${count} frames sit side by side inside a box the size of
   one, and a single transform steps across the row. steps(${
     count - 1
   }, jump-end) is what puts the element on the first frame, then on each of the
   next ${count - 2}, and leaves it on the last, with no tweening between any of
   them and nothing to undo afterwards.

   data-state is which frame rests, and it is on whatever owns the state rather
   than on the button: the cover's equalizer strip is driven by the same fact and
   the cover is a sibling of the button, and CSS cannot reach a sibling. All ${hosts.length} hosts that use this control are listed, which is why this block is
   identical in every specimen and no copy can drift. data-run is that a
   transition is under way and which way, and the client drops it on
   animationend. It stays on the button, because it describes that control's
   transition rather than a fact about the playlist or the track. */
      .play__glyph {
        overflow: hidden;
      }
      .play__strip {
        transform: translateX(0);
      }
      ${resting} {
        transform: translateX(${travel}px);
      }
      .play[data-run] .play__strip {
        animation: ${name} ${MORPH.duration} steps(${count - 1}, jump-end) both;
      }
      .play[data-run='reverse'] .play__strip {
        animation-direction: reverse;
      }
      @keyframes ${name} {
        from {
          transform: translateX(0);
        }
        to {
          transform: translateX(${travel}px);
        }
      }`;
}
