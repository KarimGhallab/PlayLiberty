import { describe, expect, it } from 'vitest';

import { EgressStatus } from '@playliberty/contracts';

import { catalogs } from '../catalogs/catalogs.js';
import { createTranslator } from '../createTranslator/createTranslator.js';
import { Language } from '../types.js';
import {
  EgressAction,
  egressFailureNotice,
  egressReasonLabel,
  egressStatusLabel,
  egressSuccessNotice,
  egressTimeLabel,
  egressUnreachableNotice
} from './egressVocabulary.js';

const t = createTranslator(catalogs[Language.English], Language.English);
const now = new Date('2026-10-01T12:00:00.000Z');
const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();

describe('the egress status word', () => {
  it('names every status', () => {
    expect(egressStatusLabel(t, EgressStatus.Ok)).toBe('OK');
    expect(egressStatusLabel(t, EgressStatus.Failed)).toBe('Failed');
    expect(egressStatusLabel(t, EgressStatus.Unknown)).toBe('Unknown');
  });
});

describe('the egress reason sentence', () => {
  it('names every known reason', () => {
    expect(egressReasonLabel(t, 'blocked')).toBe('YouTube refused the exit.');
    expect(egressReasonLabel(t, 'unavailable')).toBe(
      'The check video is unavailable.'
    );
    expect(egressReasonLabel(t, 'private')).toBe(
      'The check video is unavailable.'
    );
    expect(egressReasonLabel(t, 'network')).toBe(
      'The exit could not be reached.'
    );
  });

  it('falls back for a reason it does not know', () => {
    expect(egressReasonLabel(t, 'timeout')).toBe('The check failed.');
  });
});

describe('the egress time sentence', () => {
  it('names the never word for each timestamp', () => {
    expect(egressTimeLabel(t, null, now, 'egress.neverAttempted')).toBe(
      'No attempt yet'
    );
    expect(egressTimeLabel(t, null, now, 'egress.neverChecked')).toBe(
      'Not checked yet'
    );
  });

  it('reads a stored timestamp as a relative time', () => {
    expect(
      egressTimeLabel(t, thirtyMinutesAgo, now, 'egress.neverChecked')
    ).toBe('30 minutes ago');
  });
});

describe('the egress action notice', () => {
  it('names a switch that the agent answered', () => {
    expect(egressSuccessNotice(t, EgressAction.Switch, '02-ch')).toEqual({
      message: 'Switched to 02-ch.',
      detail: 'The exit answered YouTube.'
    });
  });

  it('names the active exit after a check', () => {
    expect(egressSuccessNotice(t, EgressAction.Check, '01-fr')).toEqual({
      message: '01-fr is active.',
      detail: 'The exit answered YouTube.'
    });
  });

  it('reports an unreachable agent in the action words', () => {
    expect(egressUnreachableNotice(t, EgressAction.Switch)).toEqual({
      message: 'The exit could not be switched.',
      detail: 'The egress agent could not be reached.'
    });
    expect(egressUnreachableNotice(t, EgressAction.Check)).toEqual({
      message: 'The check could not be completed.',
      detail: 'The egress agent could not be reached.'
    });
  });

  it('carries the server detail of a refused action', () => {
    expect(
      egressFailureNotice(t, EgressAction.Switch, 'The exit refused.')
    ).toEqual({
      message: 'The exit could not be switched.',
      detail: 'The exit refused.'
    });
    expect(egressFailureNotice(t, EgressAction.Check, null)).toEqual({
      message: 'The check could not be completed.',
      detail: null
    });
  });
});
