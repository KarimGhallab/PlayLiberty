# Typography

> Part of the design system. Index and cross-cutting rules: [`DESIGN.md`](../DESIGN.md).

One family, IBM Plex Sans, for everything including numbers. Self-hosted, never a CDN, because the
deployment is private. It is a variable font covering 400 to 600 in a single 45 KB file, so the weight
axis is `font-weight` alone and no weight costs an extra request.

No second family, and the measurement that settles it lives in `docs/design/foundations/type.html`.
Measured in the browser at a 1000px em, Plex Sans has tabular figures by default: every digit 0 to 9 has
an advance of 600, the same as a monospace face, while M and I are 812 and 400. A duration column
therefore aligns with no second family and without depending on any font feature being honoured, which
also settles the mobile question, since nothing needs `fontVariant` to work on Android.

| Token        | Value | Role                                                           |
| ------------ | ----- | -------------------------------------------------------------- |
| `--text-xs`  | 12px  | state labels, timestamps, counts. The floor.                   |
| `--text-sm`  | 14px  | track titles. The workhorse, and the scale is built around it. |
| `--text-md`  | 16px  | body copy, the first size comfortable for a sentence           |
| `--text-lg`  | 20px  | empty-state heading, and screen titles on mobile               |
| `--text-xl`  | 24px  | playlist name                                                  |
| `--text-2xl` | 32px  | screen title on web only; 32px does not fit a 390px canvas     |

The lower three sit 2px apart and read as a close pair, which is honest: they are metadata, a title and
a sentence. The upper three step by 4, 4 and 8. A one-pixel step is not a step.

Three weights and no more: `--weight-regular` 400, `--weight-medium` 500 for counts and emphasised
metadata, `--weight-semibold` 600 for screen and playlist titles. Leading is a unitless ratio so the web
can use it directly and mobile can multiply it by its own size: `--leading-tight` 1.2,
`--leading-normal` 1.35, `--leading-relaxed` 1.5.

Whether 12px is comfortable is a judgement no ratio can settle, and it was made against the real font
rather than a fallback.
