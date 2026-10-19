import { IconRotate } from '@tabler/icons-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter
} from '@tanstack/react-router';
import { fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { Playlist } from '@playliberty/contracts';
import {
  PlaylistSort,
  PlaylistSyncStatus,
  Provider,
  ShareLevel
} from '@playliberty/contracts';
import { I18nProvider } from '@playliberty/i18n';

import type { PlaylistAction } from '../../playlistActions/playlistActions';
import PlaylistCardHeader from './PlaylistCardHeader';
import PlaylistRowHeader from './PlaylistRowHeader';
import PlaylistTileHeader from './PlaylistTileHeader';

/*
 * The header under test sits inside a real router so its two links resolve the
 * way they do in the app; the route is a throwaway stub.
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
    <PlaylistRowHeader
      playlist={playlist}
      ownerName={ownerName}
      playable
      {...props}
    />
  );
}

function renderCard(
  playlist: Playlist,
  ownerName: string | null = null,
  props: Partial<Parameters<typeof PlaylistCardHeader>[0]> = {}
) {
  return renderInRouter(
    <PlaylistCardHeader
      playlist={playlist}
      ownerName={ownerName}
      playable
      {...props}
    />
  );
}

function renderTile(
  playlist: Playlist,
  ownerName: string | null = null,
  props: Partial<Parameters<typeof PlaylistTileHeader>[0]> = {}
) {
  return renderInRouter(
    <PlaylistTileHeader
      playlist={playlist}
      ownerName={ownerName}
      onPlay={() => undefined}
      onShuffle={() => undefined}
      menu={menu()}
      onOpen={() => undefined}
      playable
      {...props}
    />
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
    sort: PlaylistSort.Playlist,
    access: 'owner',
    hasShares: false,
    pinned: false,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-29T12:00:00.000Z',
    ...overrides
  };
}

/*
 * The header draws the menu it is given; the access rule and the wiring live in
 * the actions module's own test. One item is enough to draw the overflow.
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

  it('offers the named sync beside the state and starts it in one press', async () => {
    const onSync = vi.fn();
    renderRow(playlist(), null, { onSync });

    fireEvent.click(await screen.findByRole('button', { name: 'Sync now' }));

    expect(onSync).toHaveBeenCalledTimes(1);
  });

  it('shows the sync control busy and refuses a second press in flight', async () => {
    const onSync = vi.fn();
    renderRow(playlist(), null, { onSync, syncing: true });

    const control = await screen.findByRole('button', { name: 'Syncing' });

    expect(control).toBeDisabled();
    expect(control).toHaveAttribute('aria-busy', 'true');

    fireEvent.click(control);
    expect(onSync).not.toHaveBeenCalled();
  });

  it('draws no sync control when the caller cannot start one', async () => {
    renderRow(playlist());

    await screen.findByRole('link', { name: 'Rain On The Window' });

    expect(
      screen.queryByRole('button', { name: /^Sync/ })
    ).not.toBeInTheDocument();
  });

  it('renders a failed playlist as failed', async () => {
    renderRow(playlist({ syncStatus: PlaylistSyncStatus.Error }));

    expect(await screen.findByText('Sync failed')).toBeInTheDocument();
  });

  it('draws the cover from the first track thumbnail when the playlist has one', async () => {
    const { container } = renderRow(playlist({ coverTrackId: 'track-9' }));

    await screen.findByRole('link', { name: 'Rain On The Window' });

    /* The cover is the track's own route, not a third-party URL. */
    const image = container.querySelector('img');
    expect(image?.getAttribute('src')).toBe('/api/v1/tracks/track-9/thumbnail');
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(container.querySelector('[data-art="art"]')).toHaveAttribute(
      'data-sleeve'
    );
  });

  it('loads the detail hero eagerly and keeps the gallery item lazy', async () => {
    const item = renderCard(playlist({ coverTrackId: 'track-9' }), null, {
      item: true
    });
    await screen.findByRole('link', { name: 'Rain On The Window' });

    expect(item.container.querySelector('img')).toHaveAttribute(
      'loading',
      'lazy'
    );
    expect(item.container.querySelector('[data-art="art"]')).toHaveAttribute(
      'data-sleeve'
    );
    item.unmount();

    const hero = renderCard(playlist({ coverTrackId: 'track-9' }), null, {
      heading: true
    });
    await screen.findByRole('heading', { name: 'Rain On The Window' });

    expect(hero.container.querySelector('img')).toHaveAttribute(
      'loading',
      'eager'
    );
    expect(hero.container.querySelector('[data-art="art"]')).toHaveAttribute(
      'data-sleeve'
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
    expect(container.querySelector('[data-art="no-art"]')).toHaveAttribute(
      'data-sleeve'
    );
  });

  it('marks the playing row with the emphasis line, not the equalizer bars', async () => {
    const { container } = renderRow(playlist(), null, {
      current: true,
      playing: true
    });

    await screen.findByRole('link', { name: 'Rain On The Window' });

    expect(container.querySelector('[data-arrangement="row"]')).toHaveAttribute(
      'data-state',
      'playing'
    );
    expect(container.querySelector('[aria-label="Playing"]')).toBeNull();
  });

  it('draws no playing mark on a row that is not the queue', async () => {
    const { container } = renderRow(playlist());

    await screen.findByRole('link', { name: 'Rain On The Window' });

    expect(container.querySelector('[data-arrangement="row"]')).toHaveAttribute(
      'data-state',
      'paused'
    );
    expect(container.querySelector('[aria-label="Playing"]')).toBeNull();
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
          playable
          menu={menu()}
        />
        <PlaylistRowHeader
          playlist={playlist({ id: 'playlist-b', name: 'A Second Playlist' })}
          onShuffle={() => undefined}
          playable
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

  /* The pressed state is the player's shuffle AND this playlist being the
   * queue, so a reader can tell which playlist the shuffle belongs to. */
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

  /* A deferred removal marks the row: dimmed, `aria-busy`, and every door and
   * control disabled. */
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

  it('marks the pressed play while its queue read is in flight', async () => {
    renderRow(playlist(), null, {
      onPlay: () => undefined,
      playbackStarting: true
    });

    const play = await screen.findByRole('button', {
      name: 'Play this playlist'
    });

    expect(play).toBeDisabled();
    expect(play).toHaveAttribute('aria-busy', 'true');
    expect(play).toHaveAttribute('data-starting', 'true');
  });

  it('marks the pressed shuffle and leaves the play quiet', async () => {
    renderRow(playlist(), null, {
      onPlay: () => undefined,
      onShuffle: () => undefined,
      playbackStarting: true,
      startingControl: 'shuffle'
    });

    const shuffle = await screen.findByRole('button', {
      name: 'Shuffle Rain On The Window'
    });

    expect(shuffle).toBeDisabled();
    expect(shuffle).toHaveAttribute('aria-busy', 'true');
    expect(shuffle).toHaveAttribute('data-starting', 'true');
    expect(
      screen.getByRole('button', { name: 'Play this playlist' })
    ).not.toHaveAttribute('aria-busy');
  });

  it('waits the header without claiming a row press', async () => {
    renderRow(playlist(), null, {
      onPlay: () => undefined,
      playbackBusy: true
    });

    const play = await screen.findByRole('button', {
      name: 'Play this playlist'
    });

    expect(play).toBeDisabled();
    expect(play).not.toHaveAttribute('aria-busy');
    expect(play).not.toHaveAttribute('data-starting');
  });

  /* The tooltip's reveal is `:hover`/`:focus-visible` in the stylesheet, which
   * jsdom does not compute; these cover the tab stop and Escape's flag. */
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

/*
 * The tile, the library's arrangement: the same facts as the row plus the
 * library's mark, with no transport to press.
 */
describe('the tile arrangement', () => {
  it('draws the name, the share mark, the sync line with its time and the count', async () => {
    renderTile(playlist({ lastSyncedAt: null, trackCount: 128 }));

    expect(
      await screen.findByRole('link', { name: 'Rain On The Window' })
    ).toBeInTheDocument();
    expect(screen.getByText('Up to date')).toBeInTheDocument();
    expect(screen.getByText('Never synced')).toBeInTheDocument();
    expect(screen.getByText('128')).toBeInTheDocument();
    expect(screen.getByText('tracks')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Private playlist' })
    ).toBeInTheDocument();
  });

  it('names the owner of a shared playlist', async () => {
    renderTile(playlist({ access: ShareLevel.Read }), 'Ada');

    expect(await screen.findByText('Shared by Ada')).toBeInTheDocument();
  });

  /* The tile plays from its cover's corner: the play is the seam's, so it
   * names itself and pauses while this is the queue; no transport. */
  it('offers the play on the cover, and no transport', async () => {
    const onPlay = vi.fn();

    renderTile(playlist(), null, { onPlay });

    const play = await screen.findByRole('button', {
      name: 'Play Rain On The Window'
    });

    fireEvent.click(play);
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole('button', { name: 'Skip back' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Track next' })
    ).not.toBeInTheDocument();
  });

  it('shows the pause while the queue is this playlist', async () => {
    renderTile(playlist(), null, { current: true, playing: true });

    expect(
      await screen.findByRole('button', { name: 'Pause Rain On The Window' })
    ).toBeInTheDocument();
  });

  it('reads the name before its controls in the document', async () => {
    const { container } = renderTile(playlist());
    await screen.findByRole('link', { name: 'Rain On The Window' });
    const tile = container.querySelector<HTMLElement>(
      '[data-arrangement="tile"]'
    );

    if (tile === null) {
      throw new Error('The tile header must be drawn.');
    }

    const name = within(tile).getByRole('link', {
      name: 'Rain On The Window'
    });
    const controls = [
      within(tile).getByRole('button', { name: 'Play Rain On The Window' }),
      within(tile).getByRole('button', {
        name: 'Shuffle Rain On The Window'
      }),
      within(tile).getByRole('button', {
        name: 'More actions for Rain On The Window'
      })
    ];

    for (const control of controls) {
      expect(
        name.compareDocumentPosition(control) & Node.DOCUMENT_POSITION_FOLLOWING
      ).not.toBe(0);
    }
  });

  it('draws the play enabled for a playlist that holds a stored track', async () => {
    renderRow(playlist(), null, {
      onPlay: () => undefined,
      playable: true
    });

    expect(
      await screen.findByRole('button', { name: 'Play this playlist' })
    ).toBeEnabled();
  });

  /* The count is every association; the play needs a stored file. A playlist
   * whose tracks are all pending draws the control, disabled. */
  it('draws the play disabled for a playlist with nothing stored', async () => {
    renderRow(playlist({ trackCount: 3 }), null, {
      onPlay: () => undefined,
      playable: false
    });

    expect(
      await screen.findByRole('button', { name: 'Play this playlist' })
    ).toBeDisabled();
  });

  it('announces one link per item by hiding the cover’s link', async () => {
    renderTile(playlist());

    expect(
      await screen.findByRole('link', { name: 'Rain On The Window' })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('draws the mark the library hands it', async () => {
    renderTile(playlist(), null, {
      mark: <span role="img" aria-label="Mark" />
    });

    expect(
      await screen.findByRole('img', { name: 'Mark' })
    ).toBeInTheDocument();
  });

  it('opens the playlist from a press on the tile, but not from its controls', async () => {
    const onOpen = vi.fn();
    renderTile(playlist(), null, { onOpen });

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

  it('marks a pending tile, and disables every door and control', async () => {
    const { container } = renderTile(playlist(), null, { pending: true });

    expect(
      await screen.findByRole('link', { name: 'Rain On The Window' })
    ).toHaveAttribute('aria-disabled', 'true');

    const tile = container.querySelector<HTMLElement>(
      '[data-arrangement="tile"]'
    );
    expect(tile).toHaveAttribute('aria-busy', 'true');
    expect(
      screen.getByRole('button', { name: 'Shuffle Rain On The Window' })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', {
        name: 'More actions for Rain On The Window'
      })
    ).toBeDisabled();
  });

  it('has no axe violations', async () => {
    const { container } = renderTile(playlist(), null, {
      mark: <span role="img" aria-label="3 tracks are not stored" />
    });

    await screen.findByRole('link', { name: 'Rain On The Window' });

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } }
    });
    expect(results.violations).toEqual([]);
  });
});

/*
 * The card at phone width: the library's item below the breakpoint, where the
 * gallery is two columns and a tile per row would be a playlist per screen.
 */
describe('the card as an item of the library', () => {
  function renderItem(
    props: Partial<Parameters<typeof PlaylistCardHeader>[0]> = {}
  ) {
    return renderCard(playlist(), null, {
      item: true,
      mark: <span role="img" aria-label="3 tracks are not stored" />,
      onPlay: () => undefined,
      onShuffle: () => undefined,
      ...props
    });
  }

  it('announces one link per item by hiding the picture’s link', async () => {
    const { container } = renderItem();

    expect(
      await screen.findByRole('link', { name: 'Rain On The Window' })
    ).toBeInTheDocument();

    /* Two anchors and one announcement: the picture's is the door for the
     * pointers that land on the artwork. */
    expect(screen.getAllByRole('link')).toHaveLength(1);

    const picture = container.querySelector('a[aria-hidden="true"]');
    expect(picture).toHaveAttribute('tabindex', '-1');
  });

  it('holds the play in the band and both controls on the picture’s corners', async () => {
    renderItem({ menu: menu() });

    expect(
      await screen.findByRole('button', { name: 'Play Rain On The Window' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: '3 tracks are not stored' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Shuffle Rain On The Window' })
    ).toBeInTheDocument();

    /* The overflow is the shuffle's mirror on the cover, and its items are the
     * ones the actions module gated by access. */
    fireEvent.click(
      screen.getByRole('button', {
        name: 'More actions for Rain On The Window'
      })
    );
    expect(
      screen.getByRole('menuitem', { name: 'Sync now' })
    ).toBeInTheDocument();
  });

  it('becomes the pause while it is the queue that is playing', async () => {
    renderItem({ current: true, playing: true });

    expect(
      await screen.findByRole('button', { name: 'Pause Rain On The Window' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Skip back' })
    ).not.toBeInTheDocument();
  });

  it('reads the name before its controls in the document', async () => {
    const { container } = renderItem({ menu: menu() });
    await screen.findByRole('link', { name: 'Rain On The Window' });
    const card = container.querySelector<HTMLElement>(
      '[data-arrangement="card"]'
    );

    if (card === null) {
      throw new Error('The card header must be drawn.');
    }

    const name = within(card).getByRole('link', {
      name: 'Rain On The Window'
    });
    const controls = [
      within(card).getByRole('button', { name: 'Play Rain On The Window' }),
      within(card).getByRole('button', {
        name: 'Shuffle Rain On The Window'
      }),
      within(card).getByRole('button', {
        name: 'More actions for Rain On The Window'
      })
    ];

    for (const control of controls) {
      expect(
        name.compareDocumentPosition(control) & Node.DOCUMENT_POSITION_FOLLOWING
      ).not.toBe(0);
    }
  });

  /* The item's identity is the status line, not the hero's three lines: at
   * 172px the count and the state share one line and the elapsed time drops. */
  it('draws the count and the state with no elapsed time', async () => {
    renderItem();

    expect(await screen.findByText('Up to date')).toBeInTheDocument();
    expect(screen.getByText('128')).toBeInTheDocument();
    expect(screen.getByText('tracks')).toBeInTheDocument();
    expect(screen.queryByText(/Synced/)).not.toBeInTheDocument();
  });

  it('marks a pending item and blocks the picture, the name and the controls', async () => {
    const { container } = renderItem({ pending: true });

    expect(
      await screen.findByRole('link', { name: 'Rain On The Window' })
    ).toHaveAttribute('aria-disabled', 'true');

    const card = container.querySelector<HTMLElement>(
      '[data-arrangement="card"]'
    );
    expect(card).toHaveAttribute('aria-busy', 'true');

    const picture = container.querySelectorAll('a')[0];
    expect(picture).toHaveAttribute('aria-disabled', 'true');

    expect(
      screen.getByRole('button', { name: 'Play Rain On The Window' })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Shuffle Rain On The Window' })
    ).toBeDisabled();
  });

  it('has no axe violations', async () => {
    const { container } = renderItem();

    await screen.findByRole('link', { name: 'Rain On The Window' });

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } }
    });
    expect(results.violations).toEqual([]);
  });
});
