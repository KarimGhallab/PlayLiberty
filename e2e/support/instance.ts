import { writeFileSync } from 'node:fs';

import type { Page } from '@playwright/test';

import { FAKE_SCRIPT } from './paths';

/*
 * The two things every test does before it starts: choose what the fake YouTube
 * adapter will answer, and empty the instance.
 *
 * The scenario is written to the file the server's fake reads on every call, so a
 * test does not have to restart anything. The reset goes through the browser so it
 * carries the same edge identity and client header every other request does; it is
 * the test-only route the server mounts under `NODE_ENV=test`.
 */

export interface ScenarioEntry {
  videoId: string;
  title: string;
  durationSeconds?: number;
}

export interface ScenarioSource {
  title?: string;
  entries: ScenarioEntry[];
}

export interface Scenario {
  sources: Record<string, ScenarioSource>;
  downloads?: Record<string, 'ok' | 'fail' | 'gone'>;
  /** How long a successful download takes, so a test can watch the states. */
  downloadDelayMs?: number;
}

export function writeScenario(scenario: Scenario): void {
  writeFileSync(FAKE_SCRIPT, JSON.stringify(scenario, null, 2), 'utf8');
}

export async function resetInstance(page: Page): Promise<void> {
  const status = await page.evaluate(async () => {
    const response = await fetch('/api/v1/__e2e__/reset', {
      method: 'POST',
      headers: { 'X-PlayLiberty-Client': 'web' }
    });

    return response.status;
  });

  if (status !== 204) {
    throw new Error(`The instance reset answered ${status}, not 204.`);
  }
}

/*
 * Store every pending track now, rather than waiting out the worker's interval.
 *
 * The worker claims two tracks per pass and passes are 30 seconds apart, so a
 * scenario with more than two stored tracks otherwise spends a whole interval
 * waiting on the clock. The route asks the worker to run until the backlog is
 * empty, and answers when it has, so this returns once the tracks are stored.
 */
export async function drainDownloads(page: Page): Promise<void> {
  const status = await page.evaluate(async () => {
    const response = await fetch('/api/v1/__e2e__/download', {
      method: 'POST',
      headers: { 'X-PlayLiberty-Client': 'web' }
    });

    return response.status;
  });

  if (status !== 204) {
    throw new Error(`The download drain answered ${status}, not 204.`);
  }
}

/*
 * A URL whose playlist id is the scenario key. `validateYoutubeUrl` accepts a
 * playlist id of ten or more characters from the URL-safe alphabet, and the fake
 * maps the extracted id to the scenario's source, so a test names a scenario by
 * the URL it pastes.
 */
export function playlistUrl(sourceId: string): string {
  return `https://www.youtube.com/playlist?list=${sourceId}`;
}

/*
 * A URL whose video id is the scenario key, for the add-a-track dialog, which
 * takes a video and not a playlist. The fake adapter keys its scenario by the id
 * `validateYoutubeUrl` extracts, and for a video that is the `v` parameter, so a
 * video URL and a playlist URL name the same file by different keys.
 */
export function videoUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
