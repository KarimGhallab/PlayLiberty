import { IconCancel, IconRefresh } from '@tabler/icons-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type {
  Playlist,
  SyncRun,
  TrackFileStatusCounts
} from '@playliberty/contracts';
import {
  PlaylistSyncStatus,
  SyncRunStatus,
  TrackFileStatus
} from '@playliberty/contracts';
import { formatRelativeTime, providerLabel, useI18n } from '@playliberty/i18n';

import PressableScale from '../../../shared/components/PressableScale/PressableScale';
import Spinner from '../../../shared/components/Spinner/Spinner';
import {
  lineHeightFor,
  useTextScale
} from '../../../shared/styles/textMetrics';
import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenNumber,
  tokenWeight,
  touchTarget
} from '../../../shared/styles/tokens';

export interface SyncBandProps {
  readonly playlist: Playlist;
  readonly run: SyncRun;
  /* The whole playlist's counts, which do not follow a filter. */
  readonly counts: TrackFileStatusCounts;
  readonly now?: Date;
  readonly canWrite: boolean;
  /* The sync mutation, for the failed run's own retry. */
  readonly syncing: boolean;
  readonly onSync: () => void;
  readonly retryingFailed: boolean;
  readonly onRetryFailed: () => void;
  /* The running run's only cancel surface. Absent for a reader or a settled
   * run. */
  readonly onCancel?: () => void;
  readonly cancelling?: boolean;
  /* A control above may already name the run, so its stamp can step aside. */
  readonly showRunningStamp?: boolean;
  /* Stored tracks whose source removed them: the promise, not the last run. */
  readonly remoteRemoved?: number;
}

interface SummaryCell {
  readonly key: string;
  readonly count: number;
  readonly word: string;
  readonly tone?: 'added' | 'removed' | 'failed';
}

/* The latest run under the identity. A failed run replaces the summary with
 * the provider sentence, the reassurance and the server's own error. */
export default function SyncBand({
  playlist,
  run,
  counts,
  now = new Date(),
  canWrite,
  syncing,
  onSync,
  retryingFailed,
  onRetryFailed,
  onCancel,
  cancelling = false,
  showRunningStamp = true,
  remoteRemoved = 0
}: SyncBandProps) {
  const { t } = useI18n();
  const scale = useTextScale();
  const [revealed, setRevealed] = useState(false);
  const failedCount = counts[TrackFileStatus.Failed];
  const storedCount = counts[TrackFileStatus.Stored];
  const provider = providerLabel(t, playlist.provider);

  if (playlist.syncStatus === PlaylistSyncStatus.Error) {
    return (
      <View testID="sync-band" style={styles.error}>
        <View style={styles.errorBody}>
          <Text
            style={[
              styles.errorSay,
              { lineHeight: lineHeightFor('text-sm', 'leading-normal', scale) }
            ]}>
            {t('syncError.reach', { provider })}
          </Text>
          {storedCount === 0 ? null : (
            <Text
              style={[
                styles.errorSafe,
                {
                  lineHeight: lineHeightFor('text-xs', 'leading-normal', scale)
                }
              ]}>
              {t('syncError.safe', {
                count: storedCount,
                provider
              })}
            </Text>
          )}
          {canWrite ? (
            <Pressable
              testID="sync-error-retry"
              accessibilityRole="button"
              accessibilityLabel={
                syncing ? t('syncError.syncing') : t('syncError.sync')
              }
              accessibilityState={{ disabled: syncing, busy: syncing }}
              disabled={syncing}
              style={({ pressed }) => [
                styles.retry,
                syncing && styles.disabled,
                pressed && !syncing && styles.retryPressed
              ]}
              onPress={onSync}>
              {syncing ? (
                <Spinner color={tokenColor('bg')} />
              ) : (
                <IconRefresh
                  size={tokenLength('icon-sm')}
                  color={tokenColor('bg')}
                />
              )}
              <Text style={styles.retryLabel}>
                {syncing ? t('syncError.syncing') : t('syncError.sync')}
              </Text>
            </Pressable>
          ) : null}
          {run.error === null ? null : (
            <>
              <Pressable
                testID="sync-error-reveal"
                accessibilityRole="button"
                accessibilityState={{ expanded: revealed }}
                style={styles.reveal}
                onPress={() => setRevealed(value => !value)}>
                <Text style={styles.revealLabel}>
                  {revealed ? t('syncError.hide') : t('syncError.show')}
                </Text>
              </Pressable>
              {revealed ? (
                <ScrollView
                  testID="sync-error-raw-box"
                  nestedScrollEnabled
                  style={styles.rawBox}>
                  <Text
                    testID="sync-error-raw"
                    selectable
                    style={[
                      styles.raw,
                      {
                        lineHeight: lineHeightFor(
                          'text-xs',
                          'leading-normal',
                          scale
                        )
                      }
                    ]}>
                    {run.error}
                  </Text>
                </ScrollView>
              ) : null}
            </>
          )}
        </View>
      </View>
    );
  }

  const running = run.status === SyncRunStatus.Running;
  const cancelled = run.status === SyncRunStatus.Cancelled;
  const finishedAt = run.finishedAt === null ? null : new Date(run.finishedAt);
  const allCells: SummaryCell[] = [
    {
      key: 'kept',
      count: run.retainedCount,
      word: t('syncSummary.kept', { count: run.retainedCount })
    },
    {
      key: 'added',
      count: run.addedCount,
      word: t('syncSummary.added', { count: run.addedCount }),
      tone: 'added'
    },
    {
      key: 'removed',
      count: run.removedCount,
      word: t('syncSummary.removed', { count: run.removedCount }),
      tone: 'removed'
    },
    {
      key: 'failed',
      count: failedCount,
      word: t('syncSummary.failed', { count: failedCount }),
      tone: 'failed'
    }
  ];
  const cells = allCells.filter(cell => cell.count > 0);
  const downloading = counts[TrackFileStatus.Downloading];

  return (
    <View testID="sync-band" style={styles.summary}>
      {running && !showRunningStamp ? null : (
        <Text testID="sync-stamp" style={styles.stamp}>
          {cancelled
            ? t('syncSummary.cancelled')
            : running
              ? t('syncSummary.syncing')
              : t('syncSummary.lastSync', {
                  time: formatRelativeTime(t, finishedAt ?? now, now)
                })}
        </Text>
      )}
      {running && onCancel !== undefined ? (
        <PressableScale
          testID="sync-cancel"
          accessibilityRole="button"
          accessibilityLabel={`${
            cancelling ? t('syncSummary.cancelling') : t('syncSummary.cancel')
          }, ${playlist.name}`}
          accessibilityState={{ disabled: cancelling, busy: cancelling }}
          disabled={cancelling}
          style={[styles.cancel, cancelling && styles.disabled]}
          onPress={onCancel}>
          {cancelling ? (
            <Spinner color={tokenColor('tone-failed')} />
          ) : (
            <IconCancel
              size={tokenLength('icon-sm')}
              color={tokenColor('tone-failed')}
            />
          )}
          <Text style={styles.cancelLabel}>
            {cancelling ? t('syncSummary.cancelling') : t('syncSummary.cancel')}
          </Text>
        </PressableScale>
      ) : null}
      {cancelled ? null : cells.length === 0 ? (
        running ? null : (
          <Text testID="sync-no-changes" style={styles.noChanges}>
            {t('syncSummary.noChanges')}
          </Text>
        )
      ) : (
        <View style={styles.cells}>
          {cells.map(cell => (
            <View
              key={cell.key}
              testID={`sync-cell-${cell.key}`}
              accessible
              accessibilityRole="text"
              accessibilityLabel={`${cell.count} ${cell.word}`}
              style={styles.cell}>
              <Text style={[styles.count, cell.tone && toneStyle(cell.tone)]}>
                {cell.count}
              </Text>
              <Text style={styles.word}>{cell.word}</Text>
            </View>
          ))}
        </View>
      )}
      {!cancelled && canWrite && failedCount > 0 ? (
        <Pressable
          testID="sync-retry-failed"
          accessibilityRole="button"
          accessibilityLabel={
            retryingFailed
              ? t('detail.retryingFailed', { count: failedCount })
              : t('detail.retryFailed', { count: failedCount })
          }
          accessibilityState={{
            disabled: retryingFailed,
            busy: retryingFailed
          }}
          disabled={retryingFailed}
          style={({ pressed }) => [
            styles.retryFailed,
            retryingFailed && styles.disabled,
            pressed && !retryingFailed && styles.retryFailedPressed
          ]}
          onPress={onRetryFailed}>
          {retryingFailed ? (
            <Spinner color={tokenColor('ink')} />
          ) : (
            <IconRefresh
              size={tokenLength('icon-sm')}
              color={tokenColor('ink')}
            />
          )}
          <Text style={styles.retryFailedLabel}>
            {retryingFailed
              ? t('detail.retryingFailed', { count: failedCount })
              : t('detail.retryFailed', { count: failedCount })}
          </Text>
        </Pressable>
      ) : null}
      {running && downloading > 0 ? (
        <Text testID="sync-downloading" style={styles.flight}>
          {t('syncSummary.downloading', { count: downloading })}
        </Text>
      ) : null}
      {remoteRemoved > 0 ? (
        <Text
          testID="sync-remote-removed"
          style={[
            styles.retained,
            { lineHeight: lineHeightFor('text-sm', 'leading-normal', scale) }
          ]}>
          {t('syncSummary.retained', {
            count: remoteRemoved,
            provider
          })}
        </Text>
      ) : null}
    </View>
  );
}

function toneStyle(tone: NonNullable<SummaryCell['tone']>) {
  if (tone === 'added') {
    return { color: tokenColor('accent') };
  }

  if (tone === 'removed') {
    return { color: tokenColor('emphasis') };
  }

  return { color: tokenColor('tone-failed') };
}

const styles = StyleSheet.create({
  summary: {
    gap: tokenLength('space-2')
  },
  stamp: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontVariant: ['tabular-nums']
  },
  cells: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokenLength('space-4')
  },
  cell: {
    alignItems: 'center',
    gap: 2
  },
  count: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-lg'),
    fontWeight: tokenWeight('weight-semibold'),
    fontVariant: ['tabular-nums']
  },
  word: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-xs')
  },
  noChanges: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-sm')
  },
  flight: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-sm')
  },
  retained: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-sm')
  },
  retryFailed: {
    minHeight: touchTarget,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-2'),
    paddingHorizontal: tokenLength('space-4'),
    borderWidth: 1,
    borderColor: tokenColor('control-border'),
    borderRadius: tokenLength('radius-control')
  },
  cancel: {
    minHeight: touchTarget,
    maxWidth: '100%',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-2'),
    paddingHorizontal: tokenLength('space-4'),
    borderWidth: 1,
    borderColor: tokenColor('tone-failed'),
    borderRadius: tokenLength('radius-control')
  },
  cancelLabel: {
    flexShrink: 1,
    color: tokenColor('tone-failed'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontWeight: tokenWeight('weight-medium')
  },
  retryFailedPressed: {
    backgroundColor: tokenColor('surface')
  },
  retryFailedLabel: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontWeight: tokenWeight('weight-medium')
  },
  error: {
    gap: tokenLength('space-3')
  },
  errorBody: {
    gap: tokenLength('space-3'),
    paddingVertical: tokenLength('space-3'),
    paddingHorizontal: tokenLength('space-4'),
    borderWidth: 1,
    borderColor: tokenColor('line'),
    borderRadius: tokenLength('radius-card'),
    backgroundColor: tokenColor('surface')
  },
  errorSay: {
    color: tokenColor('tone-failed'),
    fontFamily,
    fontSize: tokenLength('text-sm')
  },
  errorSafe: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-xs')
  },
  retry: {
    minHeight: touchTarget,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-2'),
    paddingHorizontal: tokenLength('space-5'),
    borderRadius: tokenLength('radius-control'),
    backgroundColor: tokenColor('accent')
  },
  retryPressed: {
    backgroundColor: tokenColor('accent-hover')
  },
  retryLabel: {
    color: tokenColor('bg'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontWeight: tokenWeight('weight-medium')
  },
  reveal: {
    minHeight: touchTarget,
    justifyContent: 'center',
    alignSelf: 'flex-start'
  },
  revealLabel: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-xs'),
    textDecorationLine: 'underline'
  },
  rawBox: {
    maxHeight: tokenLength('space-6') * 5
  },
  raw: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-xs'),
    padding: tokenLength('space-3'),
    borderWidth: 1,
    borderColor: tokenColor('line'),
    borderRadius: tokenLength('radius-control'),
    backgroundColor: tokenColor('surface-raised')
  },
  disabled: {
    opacity: tokenNumber('opacity-disabled')
  }
});
