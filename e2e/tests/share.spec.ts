import { SERVER_PORT } from '../support/paths';
import {
  addPlaylist,
  openHeaderMenu,
  openPlaylist
} from '../support/playlists';
import { expect, test } from '../support/test';

/*
 * Journey 5: share a playlist, and take the share back.
 *
 * The dev proxy fixes one browser identity, so the person a playlist is shared
 * with is arranged over the API: one read of their own account with the edge's
 * headers creates them, exactly as the first request from any account would. The
 * browser then stays the owner and drives the dialog it owns.
 */

const SOURCE = 'E2Eshare01';
const TITLE = 'Evening Jazz';
const TRACK = { videoId: 'e2eshare01', title: 'Blue In Green' };
const PARTNER = {
  id: 'e2e-partner',
  name: 'Priya Partner',
  email: 'priya@example.test'
};

test('an owner grants and revokes a share with another account', async ({
  page,
  request
}) => {
  await addPlaylist(page, { sourceId: SOURCE, title: TITLE, entries: [TRACK] });
  await openPlaylist(page, TITLE);

  const created = await request.get(
    `http://127.0.0.1:${SERVER_PORT}/api/v1/me`,
    {
      headers: {
        'Remote-User': PARTNER.id,
        'Remote-Name': PARTNER.name,
        'Remote-Email': PARTNER.email
      }
    }
  );
  expect(created.ok()).toBe(true);

  // The account directory is read on mount, so the reload is what brings the
  // second account into the dialog's list.
  await page.reload();
  await openHeaderMenu(page);
  await page.getByRole('menuitem', { name: 'Share' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const partner = dialog
    .getByRole('listitem')
    .filter({ hasText: PARTNER.name });
  await expect(partner).toBeVisible();

  const canEdit = partner.getByRole('button', { name: 'Can edit' });
  await canEdit.click();
  await expect(canEdit).toHaveAttribute('aria-pressed', 'true');

  // The header marks the playlist shared, because the grant moves `hasShares`.
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(
    page.getByRole('img', { name: 'Shared playlist' })
  ).toBeVisible();

  // The grant survives a reload, so it is the server's fact and not local state.
  await page.reload();
  await expect(
    page.getByRole('img', { name: 'Shared playlist' })
  ).toBeVisible();

  // Revoking is the same switch turned off.
  await openHeaderMenu(page);
  await page.getByRole('menuitem', { name: 'Share' }).click();
  const revokeDialog = page.getByRole('dialog');
  const revokePartner = revokeDialog
    .getByRole('listitem')
    .filter({ hasText: PARTNER.name });
  const canEditAgain = revokePartner.getByRole('button', { name: 'Can edit' });
  await expect(canEditAgain).toHaveAttribute('aria-pressed', 'true');
  await canEditAgain.click();
  await expect(canEditAgain).toHaveAttribute('aria-pressed', 'false');
  await revokeDialog.getByRole('button', { name: 'Done' }).click();
});
