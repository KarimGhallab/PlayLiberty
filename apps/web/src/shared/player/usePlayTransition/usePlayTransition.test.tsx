import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { Language, catalogs, createTranslator } from '@playliberty/i18n';

import { server } from '../../../testing/mocks/server';
import { usePlayerStore } from '../playerStore/playerStore';
import {
  StartFailure,
  refusalNotice,
  usePlayTransition
} from './usePlayTransition';

const PLAYLIST = { id: 'playlist-1', name: 'Rain On The Window' } as const;
const QUEUE_URL = 'http://localhost:3000/api/v1/playlists/playlist-1/queue';

function track(id: string, fileStatus = 'stored') {
  return {
    track: {
      id,
      provider: 'youtube',
      videoId: `video-${id}`,
      title: id,
      durationSeconds: 200,
      skipNonMusic: true,
      thumbnailPath: null,
      fileStatus,
      sourceStatus: 'available',
      failureReason: null,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-29T12:00:00.000Z'
    },
    origin: 'remote',
    position: 0
  };
}

function queueList(items: unknown[]) {
  return HttpResponse.json({ items });
}

function unavailable() {
  return HttpResponse.json(
    {
      type: 'about:blank',
      title: 'Service unavailable',
      status: 503,
      detail: 'The tracks are unavailable.',
      code: 'service_unavailable'
    },
    { status: 503 }
  );
}

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function control() {
  return renderHook(() => usePlayTransition(), { wrapper });
}

function queueOf(playlistId: string, ids: string[], shuffle = false): void {
  usePlayerStore.getState().startQueue(
    playlistId,
    ids.map(id => ({
      id,
      title: id,
      playlistId,
      playlistName: 'Elsewhere',
      durationSeconds: 200,
      thumbnailPath: null
    })),
    ids[0],
    shuffle
  );
}

beforeEach(() => {
  usePlayerStore.getState().clear();
});

describe('usePlayTransition', () => {
  it('starts the playlist in its own order when the queue is another one', async () => {
    const { result } = control();

    act(() => result.current.play(PLAYLIST));

    await waitFor(() =>
      expect(usePlayerStore.getState().queue).toHaveLength(2)
    );

    const state = usePlayerStore.getState();

    expect(state.shuffle).toBe(false);
    expect(state.isPlaying).toBe(true);
    expect(state.currentId).toBe('track-1');
  });

  it('starts a shuffled queue on a stored track', async () => {
    const { result } = control();

    act(() => result.current.shuffle(PLAYLIST));

    await waitFor(() =>
      expect(usePlayerStore.getState().queue).toHaveLength(2)
    );

    const state = usePlayerStore.getState();

    expect(state.shuffle).toBe(true);
    expect(state.isPlaying).toBe(true);
    expect(new Set(state.queue.map(item => item.id))).toEqual(
      new Set(['track-1', 'track-2'])
    );
  });

  it('pauses and resumes the queue that is already this playlist’s', () => {
    const { result } = control();

    queueOf('playlist-1', ['track-2', 'track-1'], true);

    act(() => result.current.play(PLAYLIST));

    expect(usePlayerStore.getState().isPlaying).toBe(false);

    act(() => result.current.play(PLAYLIST));

    const state = usePlayerStore.getState();

    expect(state.isPlaying).toBe(true);
    expect(state.currentId).toBe('track-2');
    expect(state.queue.map(item => item.id)).toEqual(['track-2', 'track-1']);
  });

  it('turns the shuffle over instead of rebuilding the queue', () => {
    const { result } = control();

    queueOf('playlist-1', ['track-2', 'track-1'], true);

    act(() => result.current.shuffle(PLAYLIST));

    const state = usePlayerStore.getState();

    expect(state.shuffle).toBe(false);
    expect(state.queue.map(item => item.id)).toEqual(['track-2', 'track-1']);
  });

  it('builds the queue from the pressed track and starts there', async () => {
    const { result } = control();

    queueOf('playlist-9', ['elsewhere']);

    act(() => result.current.playTrack(PLAYLIST, 'track-2'));

    await waitFor(() =>
      expect(usePlayerStore.getState().queue).toHaveLength(2)
    );

    const state = usePlayerStore.getState();

    expect(state.queue.map(item => item.id)).toEqual(['track-1', 'track-2']);
    expect(state.currentId).toBe('track-2');
    expect(state.shuffle).toBe(false);
    expect(state.isPlaying).toBe(true);
  });

  it('moves the playhead inside the loaded queue rather than rebuilding it', () => {
    const { result } = control();

    queueOf('playlist-1', ['track-1', 'track-2'], true);

    act(() => result.current.playTrack(PLAYLIST, 'track-2'));

    const state = usePlayerStore.getState();

    expect(state.currentId).toBe('track-2');
    expect(state.shuffle).toBe(true);
    expect(state.queue.map(item => item.id)).toEqual(['track-1', 'track-2']);
  });

  it('pauses when the pressed track is the one already playing', () => {
    const { result } = control();

    queueOf('playlist-1', ['track-1', 'track-2']);

    act(() => result.current.playTrack(PLAYLIST, 'track-1'));

    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it('refuses a playlist with nothing stored and says so', async () => {
    server.use(http.get(QUEUE_URL, () => queueList([track('t', 'pending')])));

    const { result } = control();

    act(() => result.current.shuffle(PLAYLIST));

    await waitFor(() =>
      expect(result.current.refusal).toEqual({
        name: 'Rain On The Window',
        reason: StartFailure.Empty
      })
    );
    expect(result.current.retryable).toBe(false);
    expect(usePlayerStore.getState().queue).toHaveLength(0);
  });

  it('refuses a read that failed, and retries it as it was pressed', async () => {
    let attempts = 0;

    server.use(
      http.get(QUEUE_URL, () => {
        attempts += 1;

        return attempts === 1 ? unavailable() : queueList([track('track-1')]);
      })
    );

    const { result } = control();

    act(() => result.current.shuffle(PLAYLIST));

    await waitFor(() => expect(result.current.retryable).toBe(true));

    expect(result.current.refusal).toEqual({
      name: 'Rain On The Window',
      reason: StartFailure.Unreachable
    });
    expect(usePlayerStore.getState().queue).toHaveLength(0);

    act(() => result.current.retry());

    await waitFor(() =>
      expect(usePlayerStore.getState().queue).toHaveLength(1)
    );

    expect(usePlayerStore.getState().shuffle).toBe(true);
    expect(result.current.retryable).toBe(false);
  });

  it('reports a start in flight until the read answers', async () => {
    const { result } = control();

    act(() => result.current.play(PLAYLIST));

    expect(result.current.starting).toBe(true);

    await waitFor(() => expect(result.current.starting).toBe(false));
  });
});

describe('refusalNotice', () => {
  const t = createTranslator(catalogs[Language.English], Language.English);

  it('words an empty refusal as one sentence and one line', () => {
    expect(
      refusalNotice({ name: 'Shared Mix', reason: StartFailure.Empty }, t)
    ).toEqual({
      message: 'Nothing to play in “Shared Mix”.',
      detail: 'No track in it has finished downloading.'
    });
  });

  it('words an unreachable refusal as one sentence and one line', () => {
    expect(
      refusalNotice({ name: 'Shared Mix', reason: StartFailure.Unreachable }, t)
    ).toEqual({
      message: '“Shared Mix” could not be read.',
      detail: 'Its tracks could not be loaded.'
    });
  });
});
