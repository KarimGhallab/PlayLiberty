/*
 * The scenario both suites write and the fake server reads. The server keeps its
 * own interface because it must not depend on the test packages.
 */

export function playlistUrl(sourceId) {
  return `https://www.youtube.com/playlist?list=${sourceId}`;
}

/* The add-a-track dialog takes a video, and the fake keys its scenario by the
 * `v` parameter. */
export function videoUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
