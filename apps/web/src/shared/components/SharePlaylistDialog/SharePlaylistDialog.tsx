import { useId, useState } from 'react';

import { ShareLevel } from '@playliberty/contracts';
import type { MessageKey, Messages } from '@playliberty/i18n';
import { useI18n } from '@playliberty/i18n';

import {
  useAccountDirectory,
  useCurrentAccount,
  useGrantShare,
  usePlaylistShares,
  useRevokeShare
} from '../../api/queries/queries';
import Dialog from '../Dialog/Dialog';
import styles from '../Dialog/Dialog.module.scss';
import ReadFailure from '../ReadFailure/ReadFailure';
import shareStyles from './SharePlaylistDialog.module.scss';

/*
 * Share one playlist: the body lists the directory's accounts, each with a
 * level switch and an action. The list reads the shares, so the dialog
 * arrives knowing who already has it.
 */

interface SharePlaylistDialogProps {
  open: boolean;
  playlistId: string;
  onClose: () => void;
}

const LEVELS: readonly {
  readonly level: ShareLevel;
  readonly label: MessageKey<Messages>;
}[] = [
  { level: ShareLevel.Read, label: 'shareDialog.listen' },
  { level: ShareLevel.Write, label: 'shareDialog.edit' }
];

export default function SharePlaylistDialog({
  open,
  playlistId,
  onClose
}: SharePlaylistDialogProps) {
  const { t } = useI18n();
  const listId = useId();
  const directory = useAccountDirectory();
  const me = useCurrentAccount();
  const shares = usePlaylistShares(playlistId, open);
  const grant = useGrantShare(playlistId);
  const revoke = useRevokeShare(playlistId);
  const [working, setWorking] = useState<string | null>(null);

  /* The directory without the reader: a share with oneself is a refusal the
   * route owns, and a row that can only fail is worse than none. */
  const currentAccountId = me.data?.id ?? null;
  const candidates = (directory.data ?? []).filter(
    account => account.id !== currentAccountId
  );

  const levelOf = (accountId: string): ShareLevel | null =>
    shares.data?.find(share => share.accountId === accountId)?.level ?? null;

  const setLevel = (accountId: string, level: ShareLevel | null): void => {
    setWorking(accountId);

    if (level === null) {
      revoke.mutate(accountId, { onSettled: () => setWorking(null) });
      return;
    }

    grant.mutate({ accountId, level }, { onSettled: () => setWorking(null) });
  };

  return (
    <Dialog
      open={open}
      title={t('shareDialog.title')}
      description={t('shareDialog.description')}
      onRequestClose={onClose}
      actions={
        <button
          className={styles.dialog__secondary}
          type="button"
          onClick={onClose}>
          {t('shareDialog.done')}
        </button>
      }>
      {directory.isPending || shares.isPending ? (
        <p className={shareStyles.share__note}>{t('shareDialog.loading')}</p>
      ) : null}
      {directory.isError || shares.isError ? (
        <ReadFailure
          message={t('shareDialog.readFailed')}
          error={directory.error ?? shares.error}
          onRetry={() => {
            void directory.refetch();
            void shares.refetch();
          }}
          retrying={directory.isFetching || shares.isFetching}
        />
      ) : null}
      {candidates.length === 0 && directory.isSuccess && shares.isSuccess ? (
        <p className={shareStyles.share__note}>{t('shareDialog.empty')}</p>
      ) : null}
      {candidates.length > 0 ? (
        <ul className={shareStyles.share__list} id={listId}>
          {candidates.map(account => {
            const level = levelOf(account.id);

            return (
              <li className={shareStyles.share__item} key={account.id}>
                <span className={shareStyles.share__name}>
                  {account.displayName}
                </span>
                <span className={shareStyles.share__levels}>
                  {LEVELS.map(option => (
                    <button
                      key={option.level}
                      type="button"
                      className={shareStyles.share__level}
                      aria-pressed={level === option.level}
                      disabled={working === account.id}
                      onClick={() =>
                        setLevel(
                          account.id,
                          level === option.level ? null : option.level
                        )
                      }>
                      {t(option.label)}
                    </button>
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </Dialog>
  );
}
