import { useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { AccountSummary, Share } from '@playliberty/contracts';
import { ShareLevel } from '@playliberty/contracts';
import { problemDetail, useI18n } from '@playliberty/i18n';

import { useAnnouncement } from '../../../shared/a11y/useAnnouncement';
import AccountAvatar from '../../../shared/components/AccountAvatar/AccountAvatar';
import ReadFailure from '../../../shared/components/ReadFailure/ReadFailure';
import Sheet from '../../../shared/components/Sheet/Sheet';
import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenNumber,
  tokenWeight,
  touchTarget
} from '../../../shared/styles/tokens';

import { ApiError } from '../../../api/apiClient/ApiClient';
import { useAccount } from '../../../api/useAccount';
import { useAccountPage } from '../../../api/useAccountPage/useAccountPage';
import { useGrantShare } from '../../../api/useGrantShare';

export interface ShareAccountPickerProps {
  readonly visible: boolean;
  readonly playlistId: string | null;
  readonly shares: readonly Share[];
  readonly onClose: () => void;
}

const LOAD_MORE_DISTANCE = tokenLength('space-9') * 8;

const LEVELS: readonly ShareLevel[] = [ShareLevel.Read, ShareLevel.Write];

interface GrantRefusal {
  readonly accountId: string;
  readonly message: string;
}

/* The directory, narrowed to the accounts a share can name. The owner is left
 * out here because the route refuses a self-share; everyone else is present,
 * and an existing level is the selected one. */
export default function ShareAccountPicker({
  visible,
  playlistId,
  shares,
  onClose
}: ShareAccountPickerProps) {
  const { t } = useI18n();
  const me = useAccount(visible);
  const directory = useAccountPage(visible);
  const grant = useGrantShare(playlistId);
  const [refusal, setRefusal] = useState<GrantRefusal | null>(null);
  const [wasVisible, setWasVisible] = useState(visible);
  const liveRegion = useAnnouncement(refusal?.message ?? null);

  if (visible !== wasVisible) {
    setWasVisible(visible);

    if (visible) {
      setRefusal(null);
    }
  }

  const working = grant.isPending ? (grant.variables?.accountId ?? null) : null;
  const ownerId = me.data?.id ?? null;
  const candidates = directory.items.filter(account => account.id !== ownerId);
  const loading = me.isPending || directory.isPending;
  const failed = me.isError || directory.isError;

  const levelOf = (accountId: string): ShareLevel | null =>
    shares.find(share => share.accountId === accountId)?.level ?? null;

  const labelOf = (level: ShareLevel): string =>
    level === ShareLevel.Read ? t('shareDialog.listen') : t('shareDialog.edit');

  function choose(account: AccountSummary, level: ShareLevel): void {
    if (working !== null) {
      return;
    }

    /* The level already held is not a write; it is a way out. */
    if (levelOf(account.id) === level) {
      onClose();
      return;
    }

    setRefusal(null);
    grant.mutate(
      { accountId: account.id, level },
      {
        onSuccess: onClose,
        onError: error =>
          setRefusal({
            accountId: account.id,
            message:
              problemDetail(
                t,
                error instanceof ApiError ? error.problem : null
              ) ?? t('shareDialog.grantFailed', { name: account.displayName })
          })
      }
    );
  }

  const loadMore = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    if (!directory.hasMore || directory.isFetchingNextPage) {
      return;
    }

    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const nearBottom =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - LOAD_MORE_DISTANCE;

    if (nearBottom) {
      directory.fetchNextPage();
    }
  };

  const row = (account: AccountSummary) => {
    const held = levelOf(account.id);
    const busy = working === account.id;

    return (
      <View key={account.id} testID="share-picker-row" style={styles.row}>
        <View style={styles.line}>
          <AccountAvatar account={account} size="sm" />
          <Text numberOfLines={1} style={styles.name}>
            {account.displayName}
          </Text>
        </View>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={account.displayName}
          style={styles.levels}>
          {LEVELS.map(level => {
            const selected = held === level;

            return (
              <Pressable
                key={level}
                testID={`share-picker-level-${level}`}
                accessibilityRole="radio"
                accessibilityLabel={`${labelOf(level)}, ${account.displayName}`}
                accessibilityState={{ checked: selected, disabled: busy }}
                disabled={busy}
                style={({ pressed }) => [
                  styles.level,
                  selected && styles.levelSelected,
                  pressed && styles.levelPressed,
                  busy && styles.disabled
                ]}
                onPress={() => choose(account, level)}>
                <Text
                  style={[
                    styles.levelLabel,
                    selected && styles.levelLabelSelected
                  ]}>
                  {labelOf(level)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {refusal?.accountId === account.id ? (
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion={liveRegion}
            style={styles.message}>
            {refusal.message}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <Sheet
      visible={visible}
      title={t('shareDialog.pickerTitle')}
      onRequestClose={onClose}
      closeLabel={t('common.close')}
      testID="share-picker"
      backdropTestID="share-picker-backdrop"
      footer={
        <View style={styles.footer}>
          <Pressable
            testID="share-picker-done"
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.done,
              pressed && styles.donePressed
            ]}
            onPress={onClose}>
            <Text style={styles.doneLabel}>{t('common.cancel')}</Text>
          </Pressable>
        </View>
      }>
      {loading ? (
        <Text style={styles.note}>{t('shareDialog.loading')}</Text>
      ) : null}

      {failed ? (
        <ReadFailure
          message={t('shareDialog.readFailed')}
          retrying={me.isFetching || directory.isFetching}
          onRetry={() => {
            void me.refetch();
            directory.refetch();
          }}
        />
      ) : null}

      {directory.isSuccess && me.isSuccess ? (
        <>
          {candidates.length === 0 && !directory.hasMore ? (
            <Text style={styles.note}>{t('shareDialog.noAccounts')}</Text>
          ) : (
            <ScrollView
              testID="share-picker-list"
              style={styles.list}
              contentContainerStyle={styles.listContent}
              scrollEventThrottle={16}
              onScroll={loadMore}>
              {candidates.map(row)}
              {directory.isFetchingNextPage ? (
                <Text style={styles.note}>{t('shareDialog.loading')}</Text>
              ) : null}
              {directory.isFetchNextPageError ? (
                <Pressable
                  testID="share-picker-more-retry"
                  accessibilityRole="button"
                  style={styles.moreRetry}
                  onPress={directory.fetchNextPage}>
                  <Text style={styles.moreRetryLabel}>
                    {t('readFailure.retry')}
                  </Text>
                </Pressable>
              ) : null}
            </ScrollView>
          )}
        </>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  note: {
    marginTop: tokenLength('space-3'),
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-md'),
    lineHeight: tokenLength('text-md') * tokenNumber('leading-normal')
  },
  list: {
    maxHeight: touchTarget * 8,
    flexShrink: 1,
    marginTop: tokenLength('space-4')
  },
  listContent: {
    gap: tokenLength('space-2')
  },
  row: {
    gap: tokenLength('space-2'),
    paddingVertical: tokenLength('space-2'),
    borderBottomWidth: 1,
    borderBottomColor: tokenColor('control-border')
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-3')
  },
  name: {
    flex: 1,
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-md'),
    fontWeight: tokenWeight('weight-medium')
  },
  levels: {
    flexDirection: 'row',
    gap: tokenLength('space-2')
  },
  level: {
    minHeight: touchTarget,
    minWidth: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokenLength('space-3'),
    borderWidth: 1,
    borderColor: tokenColor('control-border'),
    borderRadius: tokenLength('radius-control')
  },
  levelSelected: {
    borderColor: tokenColor('accent'),
    backgroundColor: tokenColor('surface-raised')
  },
  levelPressed: {
    backgroundColor: tokenColor('surface-raised')
  },
  levelLabel: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-sm')
  },
  levelLabelSelected: {
    color: tokenColor('accent'),
    fontWeight: tokenWeight('weight-medium')
  },
  message: {
    color: tokenColor('tone-failed'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontWeight: tokenWeight('weight-medium'),
    lineHeight: tokenLength('text-sm') * tokenNumber('leading-normal')
  },
  moreRetry: {
    alignSelf: 'center',
    minHeight: touchTarget,
    justifyContent: 'center',
    paddingHorizontal: tokenLength('space-4'),
    paddingVertical: tokenLength('space-2')
  },
  moreRetryLabel: {
    color: tokenColor('accent'),
    fontFamily,
    fontSize: tokenLength('text-sm')
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: tokenLength('space-5')
  },
  done: {
    minHeight: touchTarget,
    minWidth: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokenLength('space-5'),
    borderWidth: 1,
    borderColor: tokenColor('control-border'),
    borderRadius: tokenLength('radius-control')
  },
  donePressed: {
    backgroundColor: tokenColor('surface-raised')
  },
  doneLabel: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-md')
  },
  disabled: {
    opacity: tokenNumber('opacity-disabled')
  }
});
