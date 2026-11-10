import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  ApiError,
  usePlaylistShares,
  useRevokeShare
} from '@playliberty/api-client';
import type { AccountSummary, Share } from '@playliberty/contracts';
import { ShareLevel } from '@playliberty/contracts';
import { problemDetail, useI18n } from '@playliberty/i18n';

import { useAnnouncement } from '../../../shared/a11y/useAnnouncement/useAnnouncement';
import AccountAvatar from '../../../shared/components/AccountAvatar/AccountAvatar';
import ReadFailure from '../../../shared/components/ReadFailure';
import Sheet from '../../../shared/components/Sheet/Sheet';
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
} from '../../../shared/styles/tokens/tokens';

import ShareAccountPicker from '../ShareAccountPicker/ShareAccountPicker';

export interface ShareSheetProps {
  readonly visible: boolean;
  readonly playlistId: string | null;
  readonly onClose: () => void;
}

interface RevokeRefusal {
  readonly accountId: string;
  readonly message: string;
}

/* Who holds the playlist, and the one destructive control. A revoke asks in
 * the row it will empty, so the question and the share share one line. */
export default function ShareSheet({
  visible,
  playlistId,
  onClose
}: ShareSheetProps) {
  const scale = useTextScale();
  const noteStyle = [
    styles.note,
    { lineHeight: lineHeightFor('text-md', 'leading-normal', scale) }
  ];
  const askStyle = [
    styles.ask,
    { lineHeight: lineHeightFor('text-sm', 'leading-normal', scale) }
  ];
  const messageStyle = [
    styles.message,
    { lineHeight: lineHeightFor('text-sm', 'leading-normal', scale) }
  ];
  const { t } = useI18n();
  const shares = usePlaylistShares(visible ? playlistId : null);
  const revoke = useRevokeShare(playlistId);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [refusal, setRefusal] = useState<RevokeRefusal | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [wasVisible, setWasVisible] = useState(visible);
  const liveRegion = useAnnouncement(refusal?.message ?? null);

  /* A fresh open must not inherit the last question or refusal. */
  if (visible !== wasVisible) {
    setWasVisible(visible);

    if (visible) {
      setConfirming(null);
      setRefusal(null);
      setPickerOpen(false);
    }
  }

  const revoking = revoke.isPending ? (revoke.variables ?? null) : null;

  function requestRevoke(account: AccountSummary): void {
    setConfirming(null);
    setRefusal(null);
    revoke.mutate(account.id, {
      onError: error =>
        setRefusal({
          accountId: account.id,
          message:
            problemDetail(
              t,
              error instanceof ApiError ? error.problem : null
            ) ?? t('shareDialog.revokeFailed', { name: account.displayName })
        })
    });
  }

  const levelLabel = (share: Share): string =>
    share.level === ShareLevel.Read
      ? t('shareDialog.listen')
      : t('shareDialog.edit');

  const row = (share: Share) => {
    const name = share.account.displayName;
    const level = levelLabel(share);
    const busy = revoking === share.accountId;
    const asking = confirming === share.accountId;

    return (
      <View key={share.accountId} testID="share-row" style={styles.row}>
        <View style={styles.line}>
          <AccountAvatar account={share.account} size="sm" />
          <View
            accessible
            accessibilityLabel={`${name}, ${level}`}
            style={styles.identity}>
            <Text numberOfLines={1} style={styles.name}>
              {name}
            </Text>
            <Text style={styles.level}>{level}</Text>
          </View>
          {asking ? null : (
            <Pressable
              testID="share-revoke"
              accessibilityRole="button"
              accessibilityLabel={`${t('shareDialog.revoke')}, ${name}`}
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              style={({ pressed }) => [
                styles.revoke,
                pressed && styles.revokePressed,
                busy && styles.disabled
              ]}
              onPress={() => {
                setRefusal(null);
                setConfirming(share.accountId);
              }}>
              <Text style={styles.revokeLabel}>{t('shareDialog.revoke')}</Text>
            </Pressable>
          )}
        </View>

        {asking ? (
          <View style={styles.confirm}>
            <Text style={askStyle}>{t('shareDialog.revokeAsk')}</Text>
            <View style={styles.confirmActions}>
              <Pressable
                testID="share-revoke-cancel"
                accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                style={({ pressed }) => [
                  styles.cancel,
                  pressed && styles.cancelPressed,
                  busy && styles.disabled
                ]}
                onPress={() => setConfirming(null)}>
                <Text style={styles.cancelLabel}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                testID="share-revoke-confirm"
                accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                style={({ pressed }) => [
                  styles.confirmAction,
                  pressed && styles.confirmActionPressed,
                  busy && styles.disabled
                ]}
                onPress={() => requestRevoke(share.account)}>
                <Text style={styles.confirmLabel}>
                  {t('shareDialog.remove')}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {refusal?.accountId === share.accountId ? (
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion={liveRegion}
            style={messageStyle}>
            {refusal.message}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <Sheet
      visible={visible}
      title={t('shareDialog.title')}
      onRequestClose={onClose}
      closeLabel={t('common.close')}
      testID="share-sheet"
      backdropTestID="share-backdrop"
      footer={
        <View style={styles.footer}>
          <Pressable
            testID="share-done"
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.done,
              pressed && styles.donePressed
            ]}
            onPress={onClose}>
            <Text style={styles.doneLabel}>{t('shareDialog.done')}</Text>
          </Pressable>
        </View>
      }>
      {shares.isPending ? (
        <Text style={noteStyle}>{t('shareDialog.loading')}</Text>
      ) : null}

      {shares.isError ? (
        <ReadFailure
          message={t('shareDialog.readFailed')}
          retrying={shares.isFetching}
          onRetry={() => void shares.refetch()}
        />
      ) : null}

      {shares.isSuccess && shares.data.length === 0 ? (
        <Text style={noteStyle}>{t('shareDialog.private')}</Text>
      ) : null}

      {shares.isSuccess && shares.data.length > 0 ? (
        <ScrollView
          testID="share-list"
          style={styles.list}
          contentContainerStyle={styles.listContent}>
          {shares.data.map(row)}
        </ScrollView>
      ) : null}

      {shares.isSuccess ? (
        <Pressable
          testID="share-add"
          accessibilityRole="button"
          style={({ pressed }) => [styles.add, pressed && styles.addPressed]}
          onPress={() => setPickerOpen(true)}>
          <Text style={styles.addLabel}>{t('shareDialog.add')}</Text>
        </Pressable>
      ) : null}

      <ShareAccountPicker
        visible={pickerOpen}
        playlistId={playlistId}
        shares={shares.data ?? []}
        onClose={() => setPickerOpen(false)}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  note: {
    marginTop: tokenLength('space-4'),
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-md')
  },
  list: {
    maxHeight: touchTarget * 7,
    flexShrink: 1,
    marginTop: tokenLength('space-4')
  },
  listContent: {
    gap: tokenLength('space-2')
  },
  row: {
    paddingVertical: tokenLength('space-2'),
    borderBottomWidth: 1,
    borderBottomColor: tokenColor('control-border')
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-3')
  },
  identity: {
    flex: 1,
    gap: tokenLength('space-1')
  },
  name: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-md'),
    fontWeight: tokenWeight('weight-medium')
  },
  level: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-sm')
  },
  revoke: {
    minHeight: touchTarget,
    minWidth: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokenLength('space-3'),
    borderWidth: 1,
    borderColor: tokenColor('tone-failed'),
    borderRadius: tokenLength('radius-control')
  },
  revokePressed: {
    backgroundColor: tokenColor('surface-raised')
  },
  revokeLabel: {
    color: tokenColor('tone-failed'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontWeight: tokenWeight('weight-medium')
  },
  confirm: {
    marginTop: tokenLength('space-2'),
    gap: tokenLength('space-2')
  },
  ask: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-sm')
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: tokenLength('space-2')
  },
  cancel: {
    minHeight: touchTarget,
    minWidth: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokenLength('space-4'),
    borderWidth: 1,
    borderColor: tokenColor('control-border'),
    borderRadius: tokenLength('radius-control')
  },
  cancelPressed: {
    backgroundColor: tokenColor('surface-raised')
  },
  cancelLabel: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-sm')
  },
  confirmAction: {
    minHeight: touchTarget,
    minWidth: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokenLength('space-4'),
    borderRadius: tokenLength('radius-control'),
    backgroundColor: tokenColor('tone-failed')
  },
  confirmActionPressed: {
    opacity: tokenNumber('opacity-disabled')
  },
  confirmLabel: {
    color: tokenColor('bg'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontWeight: tokenWeight('weight-medium')
  },
  message: {
    marginTop: tokenLength('space-2'),
    color: tokenColor('tone-failed'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontWeight: tokenWeight('weight-medium')
  },
  add: {
    minHeight: touchTarget,
    marginTop: tokenLength('space-3'),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: tokenColor('accent'),
    borderRadius: tokenLength('radius-control')
  },
  addPressed: {
    backgroundColor: tokenColor('surface-raised')
  },
  addLabel: {
    color: tokenColor('accent'),
    fontFamily,
    fontSize: tokenLength('text-md'),
    fontWeight: tokenWeight('weight-medium')
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
