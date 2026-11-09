/* The left-playlist notice crosses the replace to the bare route as memory, not
 * as a URL parameter, and is consumed once. */
let leftPlaylist = false;

export function holdLeftPlaylistNotice(): void {
  leftPlaylist = true;
}

export function takeLeftPlaylistNotice(): boolean {
  const held = leftPlaylist;

  leftPlaylist = false;

  return held;
}
