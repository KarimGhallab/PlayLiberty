import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { playlistUrl, videoUrl } from '@playliberty/e2e-shared';

/* The fixtures the mobile journeys name, created against a running harness: the
 * scenario each flow expects and the shell file the runner reads. */

const root = fileURLToPath(new URL('../../../', import.meta.url));
const api = process.env.E2E_API ?? 'http://127.0.0.1:8095';
const fakeScript =
  process.env.E2E_FAKE_SCRIPT ??
  path.join(root, 'e2e/mobile/.mobile/scenario.json');
const out =
  process.env.E2E_MOBILE_ENV ?? path.join(root, 'e2e/mobile/.mobile/env.sh');
const owner = 'dev-user';
const partner = {
  id: 'ci-partner',
  name: 'CI Partner',
  email: 'ci-partner@playliberty.test'
};

const track = (videoId, title, durationSeconds) => ({
  videoId,
  title,
  durationSeconds
});

const owned = {
  sourceId: 'CImobJazz01',
  title: 'CI Jazz',
  entries: [
    track('cimobjaz01', 'So What', 545),
    track('cimobjaz02', 'Kind Of Blue', 420),
    track('cimobjaz03', 'Blue In Green', 337),
    track('cimobjaz04', 'All Blues', 690),
    track('cimobjaz05', 'Blue Train', 640)
  ]
};
const rest = {
  sourceId: 'CImobRest01',
  title: 'CI Rest',
  entries: [
    track('cimobres01', 'Naima', 290),
    track('cimobres02', 'Equinox', 400)
  ]
};
const added = {
  sourceId: 'CImobAdd01',
  title: 'CI Added',
  entries: [track('cimobadd01', 'Maiden Voyage', 480)]
};
const video = track('cimobvid01', 'Freddie Freeloader', 590);

/** @type {import('@playliberty/e2e-shared').Scenario} */
const scenario = {
  sources: {
    [owned.sourceId]: { title: owned.title, entries: owned.entries },
    [rest.sourceId]: { title: rest.title, entries: rest.entries },
    [added.sourceId]: { title: added.title, entries: added.entries },
    [video.videoId]: { title: video.title, entries: [video] }
  },
  downloads: { [owned.entries[4].videoId]: 'fail' },
  /* The player journeys advance and seek; two seconds ends the queue first. */
  audioFixture: 'long'
};

const headers = {
  'Remote-User': owner,
  'X-PlayLiberty-Client': 'web',
  'Content-Type': 'application/json'
};

function asked(response, what) {
  if (!response.ok) {
    throw new Error(
      `${what} answered ${response.status} ${response.statusText}.`
    );
  }

  return response.json();
}

async function create(seed) {
  const response = await fetch(`${api}/api/v1/playlists`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      url: playlistUrl(seed.sourceId)
    })
  });

  if (response.status !== 202) {
    throw new Error(
      `Creating ${seed.title} answered ${response.status}, not 202.`
    );
  }

  return (await response.json()).playlistId;
}

async function settled(playlistId, count) {
  const deadline = Date.now() + 120_000;

  for (;;) {
    const page = await asked(
      await fetch(`${api}/api/v1/playlists/${playlistId}/tracks?limit=50`, {
        headers
      }),
      `Reading ${playlistId}`
    );

    if (
      page.counts.stored + page.counts.failed >= count &&
      page.counts.pending === 0 &&
      page.counts.downloading === 0
    ) {
      return page;
    }

    if (Date.now() >= deadline) {
      throw new Error(
        `${playlistId} holds ${page.counts.stored} stored and ${page.counts.failed} failed of ${count} tracks after two minutes.`
      );
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

const shell = value => `'${value.replaceAll("'", `'\\''`)}'`;

async function main() {
  mkdirSync(path.dirname(fakeScript), { recursive: true });
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(fakeScript, JSON.stringify(scenario, null, 2), 'utf8');

  /* The partner exists by reading its own account, as any account does. */
  await asked(
    await fetch(`${api}/api/v1/me`, {
      headers: {
        'Remote-User': partner.id,
        'Remote-Name': partner.name,
        'Remote-Email': partner.email
      }
    }),
    'Creating the partner account'
  );

  const ownedId = await create(owned);
  const restId = await create(rest);
  const page = await settled(ownedId, owned.entries.length);
  /* The pin flow finds its card in the rest group, which a syncing playlist
   * leaves until its last download lands. */
  await settled(restId, rest.entries.length);
  const trackId = page.items[1].track.id;

  const values = {
    OWNED_PLAYLIST: owned.title,
    SHARE_ACCOUNT: partner.name,
    PIN_PLAYLIST: rest.title,
    SOURCE_URL: playlistUrl(added.sourceId),
    VIDEO_URL: videoUrl(video.videoId),
    VIDEO_TITLE: video.title,
    PLAYLIST_ID: ownedId,
    TRACK_ID: trackId,
    TRACK_TITLE: owned.entries[1].title
  };

  const lines = Object.entries(values).map(
    ([name, value]) => `export ${name}=${shell(value)}`
  );

  writeFileSync(out, `${lines.join('\n')}\n`, 'utf8');
  console.log(`${out} carries ${lines.length} values.`);
}

await main();
