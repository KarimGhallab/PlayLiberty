import { writeFileSync } from 'node:fs';

import type { APIRequestContext, Page } from '@playwright/test';

import type { Scenario } from '@playliberty/e2e-shared';

import { FAKE_SCRIPT } from './paths';

/*
 * A scenario is written to the worker's file so a test restarts nothing. The
 * reset goes through the Vite dev server, the only thing that injects the edge
 * identity the server fails closed without.
 */

export type {
  Scenario,
  ScenarioEntry,
  ScenarioSource
} from '@playliberty/e2e-shared';
export { playlistUrl, videoUrl } from '@playliberty/e2e-shared';

export function writeScenario(scenario: Scenario): void {
  writeFileSync(FAKE_SCRIPT, JSON.stringify(scenario, null, 2), 'utf8');
}

/* A direct request rather than a page fetch, so no app load; it still reaches
 * the server through the Vite dev proxy, which carries the edge identity. */
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

/* The worker claims two tracks per 30-second pass, so this route runs it until
 * the backlog is empty and answers when it has. */
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
