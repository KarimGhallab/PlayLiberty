/* The widest the app's one column grows; a tablet centres it rather than
 * stretching the phone's chrome. */
export const MAX_CONTENT_WIDTH = 720;

export interface ContentColumn {
  readonly width: number;
  readonly left: number;
}

/** The column's width and its left edge, capped and centred inside the insets. */
export function contentColumn(
  windowWidth: number,
  leftInset: number,
  rightInset: number
): ContentColumn {
  const available = Math.max(0, windowWidth - leftInset - rightInset);
  const width = Math.min(available, MAX_CONTENT_WIDTH);

  return { width, left: leftInset + (available - width) / 2 };
}

/** The column's width for a window, capped. */
export function contentWidth(windowWidth: number): number {
  return contentColumn(windowWidth, 0, 0).width;
}
