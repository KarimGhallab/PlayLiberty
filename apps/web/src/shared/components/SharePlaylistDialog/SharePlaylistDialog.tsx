import { useId, useState } from 'react';

import { ShareLevel } from '@playliberty/contracts';

import {
  useAccountDirectory,
  useCurrentAccount,
  useGrantShare,
  usePlaylistShares,
  useRevokeShare
} from '../../api/queries/queries';
import Dialog from '../Dialog/Dialog';
import styles from '../Dialog/Dialog.module.scss';
import shareStyles from './SharePlaylistDialog.module.scss';

/*
 * Share one playlist. The body lists the accounts from the directory and the one
 * belonging to the reader is left out, because a person cannot share with
 * themselves and the route refuses it. Each name carries a level switch and an
 * action: grant turns a level on, revoke turns it off, and the two share one
 * call because sharing is one fact about a pair of accounts.
 *
 * The list is a read of the playlist's shares, so the dialog arrives knowing who
 * already has it rather than asking the person to remember. A grant and a revoke
 * both invalidate that read, so the list settles on the server's answer.
 */

interface SharePlaylistDialogProps {
  open: boolean;
  playlistId: string;
  onClose: () => void;
}

/* The invitation nobody writes down: what a share offers. */
const LEVELS: readonly { readonly level: ShareLevel; readonly word: string }[] =
  [
    { level: ShareLevel.Read, word: 'Can listen' },
    { level: ShareLevel.Write, word: 'Can edit' }
  ];

export default function SharePlaylistDialog({
  open,
  playlistId,
  onClose
}: SharePlaylistDialogProps) {
  const listId = useId();
  const directory = useAccountDirectory();
  const me = useCurrentAccount();
  const shares = usePlaylistShares(playlistId, open);
  const grant = useGrantShare(playlistId);
  const revoke = useRevokeShare(playlistId);
  const [working, setWorking] = useState<string | null>(null);

  /*
   * The directory without the reader. A share with oneself is a refusal the route
   * owns, and offering a row that can only fail is worse than not offering it.
   */
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
      title="Share playlist"
      description="Everyone you share with can find the playlist and hear its tracks. Editing also lets them change what is in it."
      onRequestClose={onClose}
      actions={
        <button
          className={styles.dialog__secondary}
          type="button"
          onClick={onClose}>
          Done
        </button>
      }>
      {directory.isPending || shares.isPending ? (
        <p className={shareStyles.share__note}>Loading accounts.</p>
      ) : null}
      {directory.isError || shares.isError ? (
        <p className={shareStyles.share__note} role="alert">
          Accounts could not be loaded.
        </p>
      ) : null}
      {candidates.length === 0 && directory.isSuccess && shares.isSuccess ? (
        <p className={shareStyles.share__note}>
          There is no one else here to share with yet.
        </p>
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
                      {option.word}
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
