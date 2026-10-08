import { IconRotate } from '@tabler/icons-react';
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
import { I18nProvider } from '@playliberty/i18n';

import type { PlaylistAction } from '../../playlistActions/playlistActions';
import PlaylistCardHeader from './PlaylistCardHeader';
import PlaylistRowHeader from './PlaylistRowHeader';

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
      <I18nProvider preferred={['en']}>
        <RouterProvider router={router} />
      </I18nProvider>
    </QueryClientProvider>
  );
}

function renderRow(
  playlist: Playlist,
  ownerName: string | null = null,
  props: Partial<Parameters<typeof PlaylistRowHeader>[0]> = {}
) {
  return renderInRouter(
    <PlaylistRowHeader playlist={playlist} ownerName={ownerName} {...props} />
  );
}

function renderCard(
  playlist: Playlist,
  ownerName: string | null = null,
  props: Partial<Parameters<typeof PlaylistCardHeader>[0]> = {}
) {
  return renderInRouter(
    <PlaylistCardHeader playlist={playlist} ownerName={ownerName} {...props} />
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

/*
 * The header draws the menu it is given; the access rule and the wiring live in
 * the actions module, which has its own test. One Sync now item is enough to draw
 * the overflow, so a rendering test hands the header a model directly.
 */
function menu(): PlaylistAction[] {
  return [
    {
      key: 'sync',
      label: 'header.syncNow',
      Icon: IconRotate,
      onSelect: () => undefined
    }
  ];
}

describe('PlaylistHeader', () => {
  it('renders the name, the sync state and the count', async () => {
    renderRow(playlist());

    expect(
      await screen.findByRole('link', { name: 'Rain On The Window' })
    ).toBeInTheDocument();
    expect(screen.getByText('Up to date')).toBeInTheDocument();
    expect(screen.getByText('128')).toBeInTheDocument();
    expect(screen.getByText('tracks')).toBeInTheDocument();
  });

  it('draws the elapsed time beside the state when the caller asks for it', async () => {
    renderRow(playlist(), null, {
      showSyncTime: true,
      now: new Date('2026-10-01T12:00:00.000Z')
    });

    expect(await screen.findByText('Up to date')).toBeInTheDocument();
    expect(screen.getByText('Synced 2 days ago')).toBeInTheDocument();
  });

  it('draws no sync time when the caller does not ask for it', async () => {
    renderRow(playlist());

    await screen.findByRole('link', { name: 'Rain On The Window' });

    expect(screen.queryByText(/Synced/)).not.toBeInTheDocument();
  });

  it('announces one link per item by hiding the cover link', async () => {
    renderRow(playlist());

    const links = await screen.findAllByRole('link');

    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName('Rain On The Window');
  });

  it('draws the name as a heading and not a link when the route owns it', async () => {
    renderRow(playlist(), null, { heading: true });

    expect(
      await screen.findByRole('heading', { name: 'Rain On The Window' })
    ).toBeInTheDocument();
    /* The route is the page it is on, so the self-link is gone. */
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('carries the full name when the line is cut to fit its column', async () => {
    const name =
      'A playlist name long enough that the gallery column cannot show it in one line';
    renderRow(playlist({ name }));

    await screen.findByRole('link', { name });
  });

  it('carries the full name on the heading arrangement too', async () => {
    const name =
      'Another playlist name too long for the detail column it is drawn in';
    renderRow(playlist({ name }), null, { heading: true });

    await screen.findByRole('heading', { name });
  });

  it('names a private owned playlist', async () => {
    renderRow(playlist());

    expect(
      await screen.findByRole('img', { name: 'Private playlist' })
    ).toBeInTheDocument();
  });

  it('names a shared owned playlist', async () => {
    renderRow(playlist({ hasShares: true }));

    expect(
      await screen.findByRole('img', { name: 'Shared playlist' })
    ).toBeInTheDocument();
  });

  it('names a collaborator playlist', async () => {
    renderRow(playlist({ access: ShareLevel.Write }));

    expect(
      await screen.findByRole('img', { name: 'You are a collaborator' })
    ).toBeInTheDocument();
  });

  it('names the owner of a shared playlist', async () => {
    renderRow(playlist({ access: ShareLevel.Read }), 'Ada');

    expect(
      await screen.findByRole('link', { name: 'Rain On The Window' })
    ).toBeInTheDocument();
    expect(screen.getByText('Shared by Ada')).toBeInTheDocument();
  });

  it('draws no owner line on an owned playlist, even when a name is passed', async () => {
    renderRow(playlist(), 'Ada');

    await screen.findByRole('link', { name: 'Rain On The Window' });

    expect(screen.queryByText(/Shared by/)).not.toBeInTheDocument();
  });

  it('draws no owner line when the owner is missing from the directory', async () => {
    renderRow(playlist({ access: ShareLevel.Read }), null);

    await screen.findByRole('link', { name: 'Rain On The Window' });

    expect(screen.queryByText(/Shared by/)).not.toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'You are a collaborator' })
    ).toBeInTheDocument();
  });

  it('renders a syncing playlist as syncing', async () => {
    renderRow(playlist({ syncStatus: PlaylistSyncStatus.Syncing }));

    expect(await screen.findByText('Syncing')).toBeInTheDocument();
  });

  it('renders a failed playlist as failed', async () => {
    renderRow(playlist({ syncStatus: PlaylistSyncStatus.Error }));

    expect(await screen.findByText('Sync failed')).toBeInTheDocument();
  });

  it('gives a no-artwork cover its derived sleeve', async () => {
    renderRow(playlist({ id: 'playlist-1' }));

    await screen.findByRole('link', { name: 'Rain On The Window' });
  });

  it('draws the cover from the first track thumbnail when the playlist has one', async () => {
    const { container } = renderRow(playlist({ coverTrackId: 'track-9' }));

    await screen.findByRole('link', { name: 'Rain On The Window' });

    /* The cover is the track's own route, not a third-party URL. */
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      '/api/v1/tracks/track-9/thumbnail'
    );
  });

  it('falls back to the sleeve when the cover image fails to load', async () => {
    const { container } = renderRow(playlist({ coverTrackId: 'track-9' }));

    await screen.findByRole('link', { name: 'Rain On The Window' });

    const image = container.querySelector('img');
    expect(image).not.toBeNull();
    fireEvent.error(image as HTMLImageElement);

    /* No empty box: the failed image becomes the sleeve. */
    expect(container.querySelector('img')).toBeNull();
  });

  it('marks the playing row with the equalizer bars', async () => {
    const { container } = renderRow(playlist(), null, {
      current: true,
      playing: true
    });

    await screen.findByRole('link', { name: 'Rain On The Window' });

    expect(container.querySelector('[aria-label="Playing"]')).not.toBeNull();
  });

  it('draws no playing mark on a row that is not the queue', async () => {
    const { container } = renderRow(playlist());

    await screen.findByRole('link', { name: 'Rain On The Window' });

    expect(container.querySelector('[aria-label="Playing"]')).toBeNull();
  });

  it('marks the sync state on the item so the cover can carry its tone', async () => {
    renderRow(playlist({ syncStatus: PlaylistSyncStatus.Error }));

    await screen.findByText('Sync failed');
  });

  it('reads a never-synced playlist by its idle state, beside a never-synced line', async () => {
    renderRow(
      playlist({ syncStatus: PlaylistSyncStatus.Idle, lastSyncedAt: null }),
      null,
      { showSyncTime: true }
    );

    expect(await screen.findByText('Up to date')).toBeInTheDocument();
    expect(screen.getByText('Never synced')).toBeInTheDocument();
  });

  it('opens the playlist from a press on the item, but not from its controls', async () => {
    const onOpen = vi.fn();
    renderRow(playlist(), null, {
      onOpen,
      onShuffle: () => undefined,
      menu: menu()
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
        <PlaylistRowHeader
          playlist={playlist({ id: 'playlist-a', name: 'Rain On The Window' })}
          onShuffle={() => undefined}
          menu={menu()}
        />
        <PlaylistRowHeader
          playlist={playlist({ id: 'playlist-b', name: 'A Second Playlist' })}
          onShuffle={() => undefined}
          menu={menu()}
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
    renderCard(playlist(), null, {
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
    renderCard(playlist(), null, {
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

  /*
   * The pressed state is the player's shuffle AND this playlist being the queue.
   * A row that is not the queue reports unpressed even while the player is
   * shuffled, so a reader can tell which playlist the shuffle belongs to.
   */
  it('leaves a row unpressed while the player is shuffled on another playlist', async () => {
    renderRow(playlist(), null, {
      onShuffle: () => undefined,
      shuffled: true
    });

    expect(
      await screen.findByRole('button', { name: 'Shuffle Rain On The Window' })
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('presses the shuffle while the player is shuffled and this playlist is the queue', async () => {
    renderRow(playlist(), null, {
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
    const { container } = renderRow(playlist(), null, {
      onOpen: () => undefined,
      onPlay: () => undefined,
      onShuffle: () => undefined,
      menu: menu(),
      pending: true
    });

    expect(
      await screen.findByRole('link', { name: 'Rain On The Window' })
    ).toHaveAttribute('aria-disabled', 'true');

    const row = container.querySelector('[data-arrangement="row"]');
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
    renderRow(playlist());

    const mark = await screen.findByRole('img', { name: 'Private playlist' });
    expect(mark).toHaveAttribute('tabindex', '0');

    mark.focus();
    expect(mark).toHaveFocus();
  });

  it('dismisses the share tooltip on Escape and reveals it again on the next focus', async () => {
    renderRow(playlist());

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
    renderRow(playlist());

    const mark = await screen.findByRole('img', { name: 'Private playlist' });
    fireEvent.focus(mark);
    fireEvent.keyDown(mark, { key: 'Escape' });
    expect(mark).toHaveAttribute('data-tip-dismissed', 'true');

    fireEvent.mouseEnter(mark);
    expect(mark).not.toHaveAttribute('data-tip-dismissed');
  });

  it('keeps the share tooltip decorative so the state is not read twice', async () => {
    renderRow(playlist());

    const mark = await screen.findByRole('img', { name: 'Private playlist' });
    const tip = mark.querySelector('[role="presentation"]');

    expect(tip).not.toBeNull();
  });

  it('has no axe violations', async () => {
    const { container } = renderRow(playlist());

    await screen.findByRole('link', { name: 'Rain On The Window' });

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } }
    });
    expect(results.violations).toEqual([]);
  });
});
