import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter
} from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '@playliberty/i18n';

import { usePlayerStore } from '../playerStore/playerStore';
import type { PlayerTrack } from '../types';
import PlayerBar from './PlayerBar';

const PLAYLIST = 'playlist-1';

/*
 * The bar's identity links resolve against a real router, and the bar is the
 * shell that survives a route change as it does in the app. The two routes are
 * throwaway stubs; preloading makes the first render synchronous.
 */
async function renderBar(initialEntry = '/') {
  const rootRoute = createRootRoute({
    component: () => (
      <>
        <PlayerBar />
        <Outlet />
      </>
    )
  });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <p>library</p>
  });
  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/playlists/$playlistId',
    component: () => <p>detail</p>
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, detailRoute]),
    history: createMemoryHistory({ initialEntries: [initialEntry] })
  });

  await router.load();

  return {
    ...render(
      <I18nProvider preferred={['en']}>
        <RouterProvider router={router} />
      </I18nProvider>
    ),
    router
  };
}

function track(id: string): PlayerTrack {
  return {
    id,
    title: id,
    playlistId: PLAYLIST,
    playlistName: 'Rain On The Window',
    durationSeconds: 180,
    thumbnailPath: null
  };
}

const first = track('track-1');
const second = track('track-2');

beforeEach(() => {
  usePlayerStore.getState().clear();
  vi.stubGlobal('scrollTo', vi.fn());
  HTMLMediaElement.prototype.play = vi.fn(() =>
    Promise.resolve()
  ) as unknown as () => Promise<void>;
  HTMLMediaElement.prototype.pause = vi.fn() as unknown as () => void;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('PlayerBar', () => {
  it('is absent at rest', async () => {
    await renderBar();

    expect(screen.queryByLabelText('Player')).not.toBeInTheDocument();
  });

  it('shows the current track, its playlist and the times', async () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first, second], first.id);
    usePlayerStore.getState().setPosition(72);
    await renderBar();

    expect(screen.getByLabelText('Player')).toBeInTheDocument();
    expect(screen.getByText('track-1')).toBeInTheDocument();
    expect(screen.getByText('Rain On The Window')).toBeInTheDocument();
    expect(screen.getByText('1:12')).toBeInTheDocument();
    expect(screen.getByText('3:00')).toBeInTheDocument();
  });

  it('opens the playing playlist from its name', async () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    const { router } = await renderBar();

    fireEvent.click(screen.getByRole('link', { name: 'Rain On The Window' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/playlists/${PLAYLIST}`);
      expect(
        screen.getByRole('link', { name: 'Rain On The Window' })
      ).toHaveAttribute('aria-disabled', 'true');
    });
  });

  it('opens the playing playlist from its cover', async () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    const { container, router } = await renderBar();
    const cover = container.querySelector('[data-art]');

    expect(cover).not.toBeNull();
    fireEvent.click(cover as Element);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/playlists/${PLAYLIST}`);
    });
  });

  it('disables both identity links on the playing playlist page', async () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    const { container, router } = await renderBar(`/playlists/${PLAYLIST}`);
    const name = screen.getByRole('link', { name: 'Rain On The Window' });
    const cover = container.querySelector('[data-art]');

    expect(name).toHaveAttribute('aria-disabled', 'true');
    expect(name).not.toHaveAttribute('href');
    expect(cover).toHaveAttribute('aria-disabled', 'true');
    expect(cover).not.toHaveAttribute('href');

    fireEvent.click(name);

    expect(router.state.location.pathname).toBe(`/playlists/${PLAYLIST}`);
  });

  it('keeps the identity links enabled on another playlist page', async () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    await renderBar('/playlists/playlist-2');

    const name = screen.getByRole('link', { name: 'Rain On The Window' });

    expect(name).not.toHaveAttribute('aria-disabled');
    expect(name).toHaveAttribute('href', `/playlists/${PLAYLIST}`);
  });

  /* In the fixed, always-visible bar, so the artwork is not deferred: it only
   * decodes off the main thread. */
  it('async-decodes the artwork without deferring it', async () => {
    const withArt = {
      ...first,
      thumbnailPath: '/api/v1/tracks/track-1/thumbnail'
    };
    usePlayerStore.getState().startQueue(PLAYLIST, [withArt], withArt.id);
    const { container } = await renderBar();

    const image = container.querySelector('img');

    expect(image).toHaveAttribute('decoding', 'async');
    expect(image).not.toHaveAttribute('loading', 'lazy');
  });

  it('toggles playback and skips within the queue', async () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first, second], first.id);
    await renderBar();

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(usePlayerStore.getState().isPlaying).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Next track' }));
    expect(usePlayerStore.getState().currentId).toBe('track-2');

    fireEvent.click(screen.getByRole('button', { name: 'Previous track' }));
    expect(usePlayerStore.getState().currentId).toBe('track-1');
  });

  it('disables next on the last track', async () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first, second], first.id);
    await renderBar();

    const next = screen.getByRole('button', { name: 'Next track' });
    expect(next).toBeEnabled();

    fireEvent.click(next);

    expect(usePlayerStore.getState().currentId).toBe('track-2');
    expect(screen.getByRole('button', { name: 'Next track' })).toBeDisabled();
  });

  it('disables next when the queue holds a single track', async () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    await renderBar();

    expect(screen.getByRole('button', { name: 'Next track' })).toBeDisabled();
  });

  it('moves the playhead with the arrow keys and jumps to the ends', async () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    await renderBar();

    const slider = screen.getByRole('slider', { name: 'Position in track' });

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(usePlayerStore.getState().positionSeconds).toBe(5);

    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(usePlayerStore.getState().positionSeconds).toBe(0);

    fireEvent.keyDown(slider, { key: 'End' });
    expect(usePlayerStore.getState().positionSeconds).toBe(180);

    fireEvent.keyDown(slider, { key: 'Home' });
    expect(usePlayerStore.getState().positionSeconds).toBe(0);
  });

  it('toggles playback from the space bar when focus is on the page body', async () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    await renderBar();

    fireEvent.keyDown(document.body, { key: ' ' });
    expect(usePlayerStore.getState().isPlaying).toBe(false);

    fireEvent.keyDown(document.body, { key: ' ' });
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });

  it('leaves Space to a focused button', async () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    await renderBar();
    const play = screen.getByRole('button', { name: 'Pause' });
    play.focus();

    const notCancelled = fireEvent.keyDown(play, { key: ' ' });

    expect(notCancelled).toBe(true);
    expect(usePlayerStore.getState().isPlaying).toBe(true);

    fireEvent.click(play);
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it('leaves the arrows to a focused menu, listbox or slider', async () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    usePlayerStore.getState().setPosition(20);
    await renderBar();

    for (const role of ['menu', 'listbox', 'slider']) {
      const widget = document.createElement('div');
      widget.setAttribute('role', role);
      widget.tabIndex = 0;
      document.body.append(widget);
      widget.focus();

      fireEvent.keyDown(widget, { key: 'ArrowRight' });

      expect(usePlayerStore.getState().positionSeconds).toBe(20);
      widget.remove();
    }
  });

  it('does not take a key another handler already prevented', async () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    await renderBar();
    const other = document.createElement('div');
    other.addEventListener('keydown', event => event.preventDefault());
    document.body.append(other);

    fireEvent.keyDown(other, { key: ' ' });

    expect(usePlayerStore.getState().isPlaying).toBe(true);
    other.remove();
  });

  it('moves the playhead by five seconds with the arrows off the seeker', async () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    await renderBar();

    fireEvent.keyDown(document.body, { key: 'ArrowRight' });
    expect(usePlayerStore.getState().positionSeconds).toBe(5);

    fireEvent.keyDown(document.body, { key: 'ArrowLeft' });
    expect(usePlayerStore.getState().positionSeconds).toBe(0);

    usePlayerStore.getState().setPosition(180);
    fireEvent.keyDown(document.body, { key: 'ArrowRight' });
    expect(usePlayerStore.getState().positionSeconds).toBe(180);
  });

  it('leaves the transport keys to a text field', async () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    await renderBar();

    const input = document.createElement('input');
    document.body.append(input);

    fireEvent.keyDown(input, { key: ' ' });
    fireEvent.keyDown(input, { key: 'ArrowRight' });

    expect(usePlayerStore.getState().isPlaying).toBe(true);
    expect(usePlayerStore.getState().positionSeconds).toBe(0);

    input.remove();
  });

  it('reports the position to assistive technology', async () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    usePlayerStore.getState().setPosition(72);
    await renderBar();

    const slider = screen.getByRole('slider', { name: 'Position in track' });

    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '180');
    expect(slider).toHaveAttribute('aria-valuenow', '72');
    expect(slider).toHaveAttribute('aria-valuetext', '1:12 of 3:00');
  });

  it('seeks to the pointer against the track box', async () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    await renderBar();

    const slider = screen.getByRole('slider', { name: 'Position in track' });
    vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      width: 200
    } as DOMRect);

    fireEvent.pointerDown(slider, { clientX: 200, pointerId: 1 });

    expect(usePlayerStore.getState().positionSeconds).toBe(90);
  });
});
