import { describe, expect, it } from 'vitest';

import { TrackFileStatus } from '@playliberty/contracts';

import { catalogs } from '../../catalogs/catalogs.js';
import { createTranslator } from '../../createTranslator/createTranslator.js';
import { Language } from '../../types.js';
import {
  cannotPlayNotice,
  leftPlaylistNotice,
  unknownTrackNotice
} from './trackLinkNotice.js';

const t = createTranslator(catalogs[Language.English], Language.English);

describe('the track-link notices', () => {
  it('explains a failed download', () => {
    expect(
      cannotPlayNotice(
        { title: 'Blue In Green', fileStatus: TrackFileStatus.Failed },
        t
      )
    ).toEqual({
      message: 'Blue In Green cannot play.',
      detail: 'Its download failed.'
    });
  });

  it('explains an unavailable file and an unstored one', () => {
    expect(
      cannotPlayNotice(
        { title: 'Blue In Green', fileStatus: TrackFileStatus.Unavailable },
        t
      ).detail
    ).toBe('Its video is gone and no file was stored.');
    expect(
      cannotPlayNotice(
        { title: 'Blue In Green', fileStatus: TrackFileStatus.Pending },
        t
      ).detail
    ).toBe('It is not stored yet.');
  });

  it('names an unknown and a left playlist', () => {
    expect(unknownTrackNotice(t)).toEqual({
      message: 'This track is not available.',
      detail: 'The link may be broken, or the track may have been deleted.'
    });
    expect(leftPlaylistNotice('Rain On The Window', t)).toEqual({
      message: 'Rain On The Window is no longer in that playlist.',
      detail: 'It is playing on its own.'
    });
  });
});
