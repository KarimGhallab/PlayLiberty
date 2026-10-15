import { writeFileSync } from 'node:fs';

import type { APIRequestContext, Page } from '@playwright/test';

import { FAKE_SCRIPT } from './paths';

/*
 * The scenario is written to the file the server's fake reads on every call, so a
 * test does not have to restart anything. The reset is a request through the Vite
 * dev server, which is the only thing that injects the edge identity the server
 * fails closed without; it is the test-only route the server mounts under
 * `NODE_ENV=test`.
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
  /** Slows a successful download so a test can watch the states. */
  downloadDelayMs?: number;
}

export function writeScenario(scenario: Scenario): void {
  writeFileSync(FAKE_SCRIPT, JSON.stringify(scenario, null, 2), 'utf8');
}

/*
 * A direct request rather than a page fetch, so a test does not pay for an app
 * load before it starts. It still reaches the server through the Vite dev server,
 * which is what carries the edge identity.
 */
export async function resetInstance(request: APIRequestContext): Promise<void> {
  const response = await request.post('/api/v1/__e2e__/reset', {
    headers: { 'X-PlayLiberty-Client': 'web' }
  });

  if (response.status() !== 204) {
    throw new Error(
      `The instance reset answered ${response.status()}, not 204.`
    );
  }
}

/*
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
 * `validateYoutubeUrl` accepts a playlist id of ten or more characters from the
 * URL-safe alphabet, and the fake maps the extracted id to the scenario's source,
 * so a test names a scenario by the URL it pastes.
 */
export function playlistUrl(sourceId: string): string {
  return `https://www.youtube.com/playlist?list=${sourceId}`;
}

/*
 * For the add-a-track dialog, which takes a video and not a playlist. The fake
 * adapter keys its scenario by the id `validateYoutubeUrl` extracts, and for a
 * video that is the `v` parameter, so a video URL and a playlist URL name the same
 * file by different keys.
 */
export function videoUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
