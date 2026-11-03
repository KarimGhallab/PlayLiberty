import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

import { stubViewport } from '../../../testing/viewport';
import { TOUCH_QUERY } from '../../useMediaQuery/useMediaQuery';
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

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <I18nProvider preferred={['en']}>
          <RouterProvider router={router} />
        </I18nProvider>
      </QueryClientProvider>
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
    expect(screen.getByRole('button', { name: 'Mute' })).toBeInTheDocument();
  });

  it('draws a track started on its own without a playlist', async () => {
    usePlayerStore.getState().startBareTrack({
      id: 'track-1',
      title: 'Blue In Green',
      durationSeconds: 180,
      thumbnailPath: null
    });
    await renderBar();

    expect(screen.getByText('Blue In Green')).toBeInTheDocument();
    expect(screen.queryAllByRole('link')).toEqual([]);
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });

  it('leaves the level to the OS on a device that cannot hover', async () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    const restore = stubViewport(TOUCH_QUERY);

    try {
      await renderBar();

      expect(
        screen.queryByRole('button', { name: 'Mute' })
      ).not.toBeInTheDocument();
    } finally {
      restore();
    }
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

  /*
   * #78 handed Space to whatever held focus; #91 takes it back, because Enter
   * and the pointer still activate every control.
   */
  it('takes Space from a focused button without activating it', async () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    await renderBar();
    const play = screen.getByRole('button', { name: 'Pause' });
    play.focus();

    /* Cancelled, so the browser synthesizes no click on the button. */
    const notCancelled = fireEvent.keyDown(play, { key: ' ' });

    expect(notCancelled).toBe(false);
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it('takes Space from a link, a slider and a focusable badge alike', async () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    await renderBar();

    const link = document.createElement('a');
    link.href = '#track';
    const slider = document.createElement('div');
    slider.setAttribute('role', 'slider');
    const badge = document.createElement('span');
    badge.setAttribute('role', 'img');

    for (const control of [link, slider, badge]) {
      control.tabIndex = 0;
      document.body.append(control);
      control.focus();
      const before = usePlayerStore.getState().isPlaying;

      const notCancelled = fireEvent.keyDown(control, { key: ' ' });

      expect(notCancelled).toBe(false);
      expect(usePlayerStore.getState().isPlaying).toBe(!before);
      control.remove();
    }
  });

  it('leaves Space to an open menu and to a dialog', async () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    await renderBar();

    for (const role of ['menu', 'dialog']) {
      const surface = document.createElement('div');
      const item = document.createElement('button');

      surface.setAttribute('role', role);
      surface.append(item);
      document.body.append(surface);
      item.focus();

      const notCancelled = fireEvent.keyDown(item, { key: ' ' });

      expect(notCancelled).toBe(true);
      expect(usePlayerStore.getState().isPlaying).toBe(true);
      surface.remove();
    }
  });

  it('skips forward with Shift+N and back with Shift+P', async () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first, second], first.id);
    await renderBar();

    fireEvent.keyDown(document.body, { key: 'N', shiftKey: true });
    expect(usePlayerStore.getState().currentId).toBe('track-2');

    fireEvent.keyDown(document.body, { key: 'P', shiftKey: true });
    expect(usePlayerStore.getState().currentId).toBe('track-1');
  });

  it('takes the chords while a button has focus', async () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first, second], first.id);
    await renderBar();
    const play = screen.getByRole('button', { name: 'Pause' });
    play.focus();

    const notCancelled = fireEvent.keyDown(play, {
      key: 'N',
      shiftKey: true
    });

    expect(notCancelled).toBe(false);
    expect(usePlayerStore.getState().currentId).toBe('track-2');
  });

  it('leaves the chords to a text field, an open menu and a dialog', async () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first, second], first.id);
    await renderBar();

    const field = document.createElement('input');
    document.body.append(field);
    field.focus();
    expect(fireEvent.keyDown(field, { key: 'N', shiftKey: true })).toBe(true);

    for (const role of ['menu', 'dialog']) {
      const surface = document.createElement('div');
      const item = document.createElement('button');

      surface.setAttribute('role', role);
      surface.append(item);
      document.body.append(surface);
      item.focus();
      expect(fireEvent.keyDown(item, { key: 'N', shiftKey: true })).toBe(true);
      surface.remove();
    }

    expect(usePlayerStore.getState().currentId).toBe('track-1');
    field.remove();
  });

  it('leaves a chord with another modifier to the browser', async () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first, second], first.id);
    await renderBar();

    for (const modifier of ['ctrlKey', 'altKey', 'metaKey'] as const) {
      const notCancelled = fireEvent.keyDown(document.body, {
        key: 'N',
        shiftKey: true,
        [modifier]: true
      });

      expect(notCancelled).toBe(true);
      expect(usePlayerStore.getState().currentId).toBe('track-1');
    }
  });

  it('is a no-op with an empty queue', async () => {
    await renderBar();

    const notCancelled = fireEvent.keyDown(window, {
      key: 'N',
      shiftKey: true
    });

    expect(notCancelled).toBe(true);
  });

  it('announces the shortcuts on the transport buttons', async () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first, second], first.id);
    await renderBar();

    expect(screen.getByRole('button', { name: 'Pause' })).toHaveAttribute(
      'aria-keyshortcuts',
      'Space'
    );
    expect(
      screen.getByRole('button', { name: 'Previous track' })
    ).toHaveAttribute('aria-keyshortcuts', 'Shift+P');
    expect(screen.getByRole('button', { name: 'Next track' })).toHaveAttribute(
      'aria-keyshortcuts',
      'Shift+N'
    );
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

  it('seeks once on release and silences the drag', async () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    await renderBar();

    const slider = screen.getByRole('slider', { name: 'Position in track' });
    vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      width: 200
    } as DOMRect);

    fireEvent.pointerDown(slider, { clientX: 200, pointerId: 1 });

    expect(usePlayerStore.getState().isPlaying).toBe(false);
    expect(usePlayerStore.getState().positionSeconds).toBe(0);
    expect(slider).toHaveAttribute('aria-valuenow', '90');

    fireEvent.pointerMove(slider, { clientX: 300, pointerId: 1 });
    expect(usePlayerStore.getState().positionSeconds).toBe(0);

    fireEvent.pointerUp(slider, { clientX: 300, pointerId: 1 });

    expect(usePlayerStore.getState().positionSeconds).toBe(180);
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });

  it('leaves a paused player paused after a drag', async () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    usePlayerStore.getState().setPlaying(false);
    await renderBar();

    const slider = screen.getByRole('slider', { name: 'Position in track' });
    vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      width: 200
    } as DOMRect);

    fireEvent.pointerDown(slider, { clientX: 200, pointerId: 1 });
    fireEvent.pointerUp(slider, { clientX: 200, pointerId: 1 });

    expect(usePlayerStore.getState().positionSeconds).toBe(90);
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });
});
