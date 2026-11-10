import { IconUserShare } from '@tabler/icons-react';
import { useLayoutEffect, useRef, useState } from 'react';

import type {
  Provider,
  TrackFileStatusCounts,
  TrackFilterState
} from '@playliberty/contracts';
import { useI18n } from '@playliberty/i18n';
/*
 * The gallery's filter rail: the ownership scope first, then the status chips
 * over that scope. Without a share the rail is the status chips alone.
 */

import type { LibraryScope } from '@playliberty/library';

import PlaylistFilterChips from '../../../shared/components/PlaylistFilterChips/PlaylistFilterChips';

import styles from './LibraryFilterBar.module.scss';

interface LibraryFilterBarProps {
  readonly hasShared: boolean;
  readonly totalCount: number;
  readonly sharedCount: number;
  readonly scope: LibraryScope;
  readonly onScopeChange: (scope: LibraryScope) => void;
  readonly counts: TrackFileStatusCounts;
  readonly remoteRemoved: number;
  readonly provider: Provider;
  readonly showStatus: boolean;
  readonly activeStatus: TrackFilterState | null;
  readonly onStatusChange: (status: TrackFilterState | null) => void;
}

export default function LibraryFilterBar({
  hasShared,
  totalCount,
  sharedCount,
  scope,
  onScopeChange,
  counts,
  remoteRemoved,
  provider,
  showStatus,
  activeStatus,
  onStatusChange
}: LibraryFilterBarProps) {
  const { t } = useI18n();
  const allLabel = t('library.scopeAll');
  const sharedLabel = t('library.scopeShared');
  const pairRef = useRef<HTMLDivElement>(null);
  const allRef = useRef<HTMLButtonElement>(null);
  const sharedRef = useRef<HTMLButtonElement>(null);
  const [thumb, setThumb] = useState<{
    readonly left: number;
    readonly width: number;
  } | null>(null);

  /*
   * The thumb travels between two labels of different widths, so its place and
   * size are measured, not guessed. A late font or a language swap re-measures.
   */
  useLayoutEffect(() => {
    const pair = pairRef.current;
    const active = scope === 'shared' ? sharedRef.current : allRef.current;

    if (pair === null || active === null) {
      return;
    }

    const measure = (): void => {
      const base = pair.getBoundingClientRect();
      const rect = active.getBoundingClientRect();

      setThumb({
        left: rect.left - base.left - pair.clientLeft,
        width: rect.width
      });
    };

    measure();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(measure);
    observer.observe(pair);
    observer.observe(active);

    return () => observer.disconnect();
  }, [scope, hasShared]);

  if (!hasShared && !showStatus) {
    return null;
  }

  return (
    <div className={styles.bar}>
      {hasShared ? (
        <>
          <div
            ref={pairRef}
            className={styles.pair}
            data-scope={scope}
            role="group"
            aria-label={t('library.scopeLabel')}>
            <span
              className={styles.pair__thumb}
              aria-hidden="true"
              style={
                thumb === null
                  ? undefined
                  : {
                      width: thumb.width,
                      transform: `translateX(${thumb.left}px)`
                    }
              }
            />
            <button
              ref={allRef}
              type="button"
              className={styles.pair__segment}
              aria-label={`${allLabel} ${totalCount}`}
              aria-pressed={scope === 'all'}
              onClick={() => onScopeChange('all')}>
              <span>{allLabel}</span>
              <span className={styles.pair__count}>{totalCount}</span>
            </button>
            <button
              ref={sharedRef}
              type="button"
              className={styles.pair__segment}
              aria-label={`${sharedLabel} ${sharedCount}`}
              aria-pressed={scope === 'shared'}
              onClick={() => onScopeChange('shared')}>
              <IconUserShare
                className={styles.pair__glyph}
                aria-hidden="true"
                focusable="false"
              />
              <span>{sharedLabel}</span>
              <span className={styles.pair__count}>{sharedCount}</span>
            </button>
          </div>
          {showStatus ? (
            <span className={styles.divider} aria-hidden="true" />
          ) : null}
        </>
      ) : null}
      {showStatus ? (
        <div className={styles.status}>
          <PlaylistFilterChips
            counts={counts}
            remoteRemoved={remoteRemoved}
            provider={provider}
            active={activeStatus}
            showEmpty={false}
            allLabelKey={hasShared ? 'library.allTracks' : undefined}
            onChange={onStatusChange}
          />
        </div>
      ) : null}
    </div>
  );
}
