import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter
} from '@tanstack/react-router';
import { fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  PlaylistSyncStatus,
  Provider,
  ShareLevel
} from '@playliberty/contracts';
import type { Playlist } from '@playliberty/contracts';

import PlaylistHeader from './PlaylistHeader';

/*
 * The header under test sits inside a real router so its two links resolve the
 * way they do in the app. The route is a throwaway `/playlists/$playlistId` with
 * a stub component, because nothing here asserts what the destination draws.
 */
function renderInRouter(element: ReactNode) {
  const rootRoute = createRootRoute();
  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/playlists/$playlistId',
    component: () => <p>detail</p>
  });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => element
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, detailRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] })
  });
  const queryClient = new QueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

function renderHeader(
  playlist: Playlist,
  ownerName: string | null = null,
  props: Partial<Parameters<typeof PlaylistHeader>[0]> = {}
) {
  return renderInRouter(
    <PlaylistHeader playlist={playlist} ownerName={ownerName} {...props} />
  );
}

function playlist(overrides: Partial<Playlist> = {}): Playlist {
  return {
    id: 'playlist-1',
    ownerAccountId: 'account-1',
    name: 'Rain On The Window',
    coverTrackId: null,
    provider: Provider.Youtube,
    sourcePlaylistId: 'PL-demo',
    syncStatus: PlaylistSyncStatus.Idle,
    lastSyncedAt: '2026-09-29T12:00:00.000Z',
    trackCount: 128,
    skipNonMusic: true,
    access: 'owner',
    hasShares: false,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-29T12:00:00.000Z',
    ...overrides
  };
}

describe('PlaylistHeader', () => {
  it('renders the name, the sync state and the count', async () => {
    renderHeader(playlist());

    expect(
      await screen.findByRole('link', { name: 'Rain On The Window' })
    ).toBeInTheDocument();
    expect(screen.getByText('Up to date')).toBeInTheDocument();
    expect(screen.getByText('128')).toBeInTheDocument();
    expect(screen.getByText('tracks')).toBeInTheDocument();
  });

  it('draws the elapsed time beside the state when the caller asks for it', async () => {
    renderHeader(playlist(), null, {
      showSyncTime: true,
      now: new Date('2026-10-01T12:00:00.000Z')
    });

    expect(await screen.findByText('Up to date')).toBeInTheDocument();
    expect(screen.getByText('Synced 2 days ago')).toBeInTheDocument();
  });

  it('draws no sync time when the caller does not ask for it', async () => {
    renderHeader(playlist());

    await screen.findByRole('link', { name: 'Rain On The Window' });

    expect(screen.queryByText(/Synced/)).not.toBeInTheDocument();
  });

  it('announces one link per item by hiding the cover link', async () => {
    renderHeader(playlist());

    const links = await screen.findAllByRole('link');

    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName('Rain On The Window');
  });

  it('draws the name as a heading and not a link when the route owns it', async () => {
    renderHeader(playlist(), null, { heading: true });

    expect(
      await screen.findByRole('heading', { name: 'Rain On The Window' })
    ).toBeInTheDocument();
    /* The route is the page it is on, so the self-link is gone. */
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('carries the full name when the line is cut to fit its column', async () => {
    const name =
      'A playlist name long enough that the gallery column cannot show it in one line';
    renderHeader(playlist({ name }));

    const link = await screen.findByRole('link', { name });

    expect(link).toHaveAttribute('title', name);
  });

  it('carries the full name on the heading arrangement too', async () => {
    const name =
      'Another playlist name too long for the detail column it is drawn in';
    renderHeader(playlist({ name }), null, { heading: true });

    const heading = await screen.findByRole('heading', { name });

    expect(heading).toHaveAttribute('title', name);
  });

  it('names a private owned playlist', async () => {
    renderHeader(playlist());

    expect(
      await screen.findByRole('img', { name: 'Private playlist' })
    ).toBeInTheDocument();
  });

  it('names a shared owned playlist', async () => {
    renderHeader(playlist({ hasShares: true }));

    expect(
      await screen.findByRole('img', { name: 'Shared playlist' })
    ).toBeInTheDocument();
  });

  it('names a collaborator playlist', async () => {
    renderHeader(playlist({ access: ShareLevel.Write }));

    expect(
      await screen.findByRole('img', { name: 'You are a collaborator' })
    ).toBeInTheDocument();
  });

  it('names the owner of a shared playlist', async () => {
    renderHeader(playlist({ access: ShareLevel.Read }), 'Ada');

    expect(
      await screen.findByRole('link', { name: 'Rain On The Window' })
    ).toBeInTheDocument();
    expect(screen.getByText('Shared by Ada')).toBeInTheDocument();
  });

  it('draws no owner line on an owned playlist, even when a name is passed', async () => {
    renderHeader(playlist(), 'Ada');

    await screen.findByRole('link', { name: 'Rain On The Window' });

    expect(screen.queryByText(/Shared by/)).not.toBeInTheDocument();
  });

  it('draws no owner line when the owner is missing from the directory', async () => {
    renderHeader(playlist({ access: ShareLevel.Read }), null);

    await screen.findByRole('link', { name: 'Rain On The Window' });

    expect(screen.queryByText(/Shared by/)).not.toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'You are a collaborator' })
    ).toBeInTheDocument();
  });

  it('renders a syncing playlist as syncing', async () => {
    renderHeader(playlist({ syncStatus: PlaylistSyncStatus.Syncing }));

    expect(await screen.findByText('Syncing')).toBeInTheDocument();
  });

  it('renders a failed playlist as failed', async () => {
    renderHeader(playlist({ syncStatus: PlaylistSyncStatus.Error }));

    expect(await screen.findByText('Sync failed')).toBeInTheDocument();
  });

  it('gives a no-artwork cover its derived sleeve', async () => {
    const { container } = renderHeader(playlist({ id: 'playlist-1' }));

    await screen.findByRole('link', { name: 'Rain On The Window' });

    const sleeve = container.querySelector('[data-sleeve]');
    expect(sleeve).not.toBeNull();
    const index = Number(sleeve?.getAttribute('data-sleeve'));
    expect(index).toBeGreaterThanOrEqual(1);
    expect(index).toBeLessThanOrEqual(6);
  });

  it('draws the cover from the first track thumbnail when the playlist has one', async () => {
    const { container } = renderHeader(playlist({ coverTrackId: 'track-9' }));

    await screen.findByRole('link', { name: 'Rain On The Window' });

    /* The cover is the track's own route, not a third-party URL. */
    expect(container.querySelector('[data-art="art"]')).not.toBeNull();
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      '/api/v1/tracks/track-9/thumbnail'
    );
  });

  it('falls back to the sleeve when the cover image fails to load', async () => {
    const { container } = renderHeader(playlist({ coverTrackId: 'track-9' }));

    await screen.findByRole('link', { name: 'Rain On The Window' });

    const image = container.querySelector('img');
    expect(image).not.toBeNull();
    fireEvent.error(image as HTMLImageElement);

    /* No empty box: the failed image becomes the sleeve. */
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[data-art="no-art"]')).not.toBeNull();
    expect(container.querySelector('[data-sleeve]')).not.toBeNull();
  });

  it('draws the cover as a blurred ground behind the row when asked', async () => {
    const { container } = renderHeader(
      playlist({ coverTrackId: 'track-9' }),
      null,
      { ground: true }
    );

    await screen.findByRole('link', { name: 'Rain On The Window' });

    const ground = container.querySelector(
      '[data-ground="art"]'
    ) as HTMLElement | null;
    expect(ground).not.toBeNull();
    /* The ground is the full cover, blurred by the stylesheet, not the small
     * derivative the server used to write. */
    expect(ground?.style.backgroundImage).toContain(
      '/tracks/track-9/thumbnail'
    );
    expect(ground?.style.backgroundImage).not.toContain('size=small');
  });

  it('gives the ground the sleeve hue when the playlist has no cover', async () => {
    const { container } = renderHeader(playlist(), null, { ground: true });

    await screen.findByRole('link', { name: 'Rain On The Window' });

    const ground = container.querySelector('[data-ground="sleeve"]');
    expect(ground).not.toBeNull();
    expect(ground?.getAttribute('data-sleeve')).not.toBeNull();
  });

  it('draws the cover as a ground behind the card when asked', async () => {
    const { container } = renderHeader(
      playlist({ coverTrackId: 'track-9' }),
      null,
      { arrangement: 'card', ground: true }
    );

    await screen.findByRole('link', { name: 'Rain On The Window' });

    /* The card is marked as grounded, so its own surface drops and the ground
     * shows through it. */
    expect(
      container
        .querySelector('[data-arrangement="card"]')
        ?.getAttribute('data-ground')
    ).toBe('true');

    const ground = container.querySelector(
      '[data-ground="art"]'
    ) as HTMLElement | null;
    expect(ground).not.toBeNull();
    expect(ground?.style.backgroundImage).toContain(
      '/tracks/track-9/thumbnail'
    );
  });

  it('marks the playing row with the equalizer bars', async () => {
    const { container } = renderHeader(playlist(), null, {
      current: true,
      playing: true
    });

    await screen.findByRole('link', { name: 'Rain On The Window' });

    expect(container.querySelector('[aria-label="Playing"]')).not.toBeNull();
  });

  it('draws no playing mark on a row that is not the queue', async () => {
    const { container } = renderHeader(playlist());

    await screen.findByRole('link', { name: 'Rain On The Window' });

    expect(container.querySelector('[aria-label="Playing"]')).toBeNull();
  });

  it('marks the sync state on the item so the cover can carry its tone', async () => {
    renderHeader(playlist({ syncStatus: PlaylistSyncStatus.Error }));

    const state = await screen.findByText('Sync failed');

    expect(state).toHaveAttribute('data-state', 'error');
  });

  it('reads a never-synced playlist by its idle state, beside a never-synced line', async () => {
    renderHeader(
      playlist({ syncStatus: PlaylistSyncStatus.Idle, lastSyncedAt: null }),
      null,
      { showSyncTime: true }
    );

    expect(await screen.findByText('Up to date')).toBeInTheDocument();
    expect(screen.getByText('Never synced')).toBeInTheDocument();
  });

  it('opens the playlist from a press on the item, but not from its controls', async () => {
    const onOpen = vi.fn();
    renderHeader(playlist(), null, {
      onOpen,
      onShuffle: () => undefined,
      onSync: () => undefined
    });

    await screen.findByRole('link', { name: 'Rain On The Window' });

    fireEvent.click(screen.getByText('Up to date'));
    expect(onOpen).toHaveBeenCalledTimes(1);

    fireEvent.click(
      screen.getByRole('button', { name: 'Shuffle Rain On The Window' })
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: 'More actions for Rain On The Window'
      })
    );
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('ties each row control to its own playlist', async () => {
    renderInRouter(
      <>
        <PlaylistHeader
          playlist={playlist({ id: 'playlist-a', name: 'Rain On The Window' })}
          onShuffle={() => undefined}
          onSync={() => undefined}
        />
        <PlaylistHeader
          playlist={playlist({ id: 'playlist-b', name: 'A Second Playlist' })}
          onShuffle={() => undefined}
          onSync={() => undefined}
        />
      </>
    );

    expect(
      await screen.findByRole('button', {
        name: 'Shuffle Rain On The Window'
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Shuffle A Second Playlist' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'More actions for Rain On The Window'
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'More actions for A Second Playlist'
      })
    ).toBeInTheDocument();
  });

  it('disables the next step when the queue has no next track', async () => {
    renderHeader(playlist(), null, {
      arrangement: 'card',
      playing: true,
      current: true,
      onPlay: () => undefined,
      onSkipBack: () => undefined,
      onSkipNext: () => undefined,
      hasNext: false
    });

    expect(
      await screen.findByRole('button', { name: 'Track next' })
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Skip back' })).toBeEnabled();
  });

  it('keeps the steps while the queue is paused on this playlist', async () => {
    renderHeader(playlist(), null, {
      arrangement: 'card',
      playing: false,
      current: true,
      onPlay: () => undefined,
      onSkipBack: () => undefined,
      onSkipNext: () => undefined
    });

    expect(
      await screen.findByRole('button', { name: 'Skip back' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Track next' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Play this playlist' })
    ).toBeInTheDocument();
  });

  it('sits the shuffle immediately left of the overflow on the card', async () => {
    renderHeader(playlist(), null, {
      arrangement: 'card',
      onPlay: () => undefined,
      onShuffle: () => undefined,
      onSync: () => undefined
    });

    const shuffle = await screen.findByRole('button', {
      name: 'Shuffle Rain On The Window'
    });
    const menuAnchor = screen.getByRole('button', {
      name: 'More actions for Rain On The Window'
    }).parentElement;
    const group = shuffle.parentElement;

    expect(group).not.toBeNull();
    expect(menuAnchor?.parentElement).toBe(group);
    expect(Array.from(group?.children ?? []).indexOf(shuffle)).toBeLessThan(
      Array.from(group?.children ?? []).indexOf(menuAnchor as Element)
    );
    expect(shuffle).toHaveAttribute('aria-pressed', 'false');
  });

  /*
   * The pressed state is the player's shuffle AND this playlist being the queue.
   * A row that is not the queue reports unpressed even while the player is
   * shuffled, so a reader can tell which playlist the shuffle belongs to.
   */
  it('leaves a row unpressed while the player is shuffled on another playlist', async () => {
    renderHeader(playlist(), null, {
      onShuffle: () => undefined,
      shuffled: true
    });

    expect(
      await screen.findByRole('button', { name: 'Shuffle Rain On The Window' })
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('presses the shuffle while the player is shuffled and this playlist is the queue', async () => {
    renderHeader(playlist(), null, {
      onShuffle: () => undefined,
      shuffled: true,
      current: true
    });

    expect(
      await screen.findByRole('button', { name: 'Shuffle Rain On The Window' })
    ).toHaveAttribute('aria-pressed', 'true');
  });

  /*
   * A deferred removal marks the row: dimmed through `data-pending`, `aria-busy`,
   * and every door and control disabled, so the thing the toast says is going
   * cannot still be opened, played, shuffled or acted on.
   */
  it('marks a pending row and disables every door and control', async () => {
    const { container } = renderHeader(playlist(), null, {
      onOpen: () => undefined,
      onPlay: () => undefined,
      onShuffle: () => undefined,
      onSync: () => undefined,
      pending: true
    });

    expect(
      await screen.findByRole('link', { name: 'Rain On The Window' })
    ).toHaveAttribute('aria-disabled', 'true');

    const row = container.querySelector('[data-arrangement="row"]');
    expect(row).toHaveAttribute('data-pending', 'true');
    expect(row).toHaveAttribute('aria-busy', 'true');
    expect(
      screen.getByRole('button', { name: 'Play this playlist' })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Shuffle Rain On The Window' })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', {
        name: 'More actions for Rain On The Window'
      })
    ).toBeDisabled();
  });

  /*
   * The share tooltip is WCAG 1.4.13 content: the glyph's meaning has to be
   * available to a keyboard or touch user, not only a pointer. The reveal itself
   * is `:hover` and `:focus-visible` in the stylesheet, which jsdom does not
   * compute, so these hold the two things the component owns: the mark is a tab
   * stop, and Escape's dismissal flag outranks the reveal and lifts on the next
   * focus or hover.
   */
  it('puts the share indicator in the tab order', async () => {
    renderHeader(playlist());

    const mark = await screen.findByRole('img', { name: 'Private playlist' });
    expect(mark).toHaveAttribute('tabindex', '0');

    mark.focus();
    expect(mark).toHaveFocus();
  });

  it('dismisses the share tooltip on Escape and reveals it again on the next focus', async () => {
    renderHeader(playlist());

    const mark = await screen.findByRole('img', { name: 'Private playlist' });
    mark.focus();
    expect(mark).not.toHaveAttribute('data-tip-dismissed');

    fireEvent.keyDown(mark, { key: 'Escape' });
    expect(mark).toHaveAttribute('data-tip-dismissed', 'true');

    fireEvent.blur(mark);
    mark.focus();
    expect(mark).not.toHaveAttribute('data-tip-dismissed');
  });

  it('reveals the share tooltip again when the pointer returns to the mark', async () => {
    renderHeader(playlist());

    const mark = await screen.findByRole('img', { name: 'Private playlist' });
    fireEvent.focus(mark);
    fireEvent.keyDown(mark, { key: 'Escape' });
    expect(mark).toHaveAttribute('data-tip-dismissed', 'true');

    fireEvent.mouseEnter(mark);
    expect(mark).not.toHaveAttribute('data-tip-dismissed');
  });

  it('keeps the share tooltip decorative so the state is not read twice', async () => {
    renderHeader(playlist());

    const mark = await screen.findByRole('img', { name: 'Private playlist' });
    const tip = mark.querySelector('[role="presentation"]');

    expect(tip).not.toBeNull();
    expect(tip).toHaveTextContent('Private playlist');
  });

  it('has no axe violations', async () => {
    const { container } = renderHeader(playlist());

    await screen.findByRole('link', { name: 'Rain On The Window' });

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } }
    });
    expect(results.violations).toEqual([]);
  });
});
