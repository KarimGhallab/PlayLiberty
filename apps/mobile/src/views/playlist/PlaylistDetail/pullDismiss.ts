import { tokenLength } from '../../../shared/styles/tokens';

/* A downward pull takes the gesture as early as the list's own scroll would,
 * so the list does not win the drag before the sheet does. */
const CLAIM_DISTANCE = tokenLength('space-2');
const CLAIM_LEAD = 1.2;
/* How far the sheet travels before a release commits to the gallery. */
const DISMISS_DISTANCE = tokenLength('space-9') * 2;
/* A flick carries earlier, but only with real travel behind it. */
const FLING_VELOCITY = 0.5;
const FLING_DISTANCE = tokenLength('space-9') / 2;

export interface PullClaim {
  readonly dx: number;
  readonly dy: number;
  /* The list's offset when the touch began; above zero the list owns the pull. */
  readonly offset: number;
  /* Where the touch began, in window coordinates. */
  readonly startY: number;
  /* The header's lower edge, in window coordinates. */
  readonly headerBottom: number;
}

/* The header is a handle at any scroll position; the list is one only at its
 * top, where a downward pull has nowhere else to go. */
export function claimsPull({
  dx,
  dy,
  offset,
  startY,
  headerBottom
}: PullClaim): boolean {
  if (dy < CLAIM_DISTANCE || dy <= Math.abs(dx) * CLAIM_LEAD) {
    return false;
  }

  return offset <= 0 || startY <= headerBottom;
}

export function commitsPull(dy: number, vy: number): boolean {
  return dy > DISMISS_DISTANCE || (vy > FLING_VELOCITY && dy > FLING_DISTANCE);
}
