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
 * A URL whose playlist id is the scenario key. `validateYoutubeUrl` accepts a
 * playlist id of ten or more characters from the URL-safe alphabet, and the fake
 * maps the extracted id to the scenario's source, so a test names a scenario by
 * the URL it pastes.
 */
export function playlistUrl(sourceId: string): string {
  return `https://www.youtube.com/playlist?list=${sourceId}`;
}
