import { describe, expect, it } from 'vitest';

import type { Messages, Translator } from '@playliberty/i18n';
import { Language, catalogs, createTranslator } from '@playliberty/i18n';

import type { PlayerTrack } from '../player/types';
import { documentTitle } from './useDocumentTitle';

const english: Translator<Messages> = createTranslator(
  catalogs[Language.English],
  Language.English
);
const french: Translator<Messages> = createTranslator(
  catalogs[Language.French],
  Language.French
);

const TRACK: PlayerTrack = {
  id: 'track-1',
  title: 'Blue In Green',
  playlistId: 'playlist-1',
  playlistName: 'Rain On The Window',
  durationSeconds: 337,
  thumbnailPath: null
};

describe('documentTitle', () => {
  it('names the app alone when nothing is open', () => {
    expect(documentTitle(english, null, null)).toBe('PlayLiberty');
  });

  it('names the open playlist', () => {
    expect(documentTitle(english, 'Rain On The Window', null)).toBe(
      'PlayLiberty - Rain On The Window'
    );
  });

  it('names the playing track under its own playlist', () => {
    expect(documentTitle(english, 'Rain On The Window', TRACK)).toBe(
      'PlayLiberty - Rain On The Window (Blue In Green)'
    );
  });

  it('names a track started on its own without a playlist', () => {
    const bare: PlayerTrack = {
      ...TRACK,
      playlistId: null,
      playlistName: null
    };

    expect(documentTitle(english, null, bare)).toBe(
      'PlayLiberty - Blue In Green'
    );
    expect(documentTitle(french, null, bare)).toBe(
      'PlayLiberté - Blue In Green'
    );
  });

  it('carries the active language into the name', () => {
    expect(documentTitle(french, null, null)).toBe('PlayLiberté');
    expect(documentTitle(french, null, TRACK)).toBe(
      'PlayLiberté - Rain On The Window (Blue In Green)'
    );
  });
});
