import { randomUUID } from 'node:crypto';

import type { IPangolinClient } from '../../../shared/pangolin.js';

/*
 * The edge's integration API, faked: the browser provisions without a Pangolin
 * instance, and the minted token is a uuid that never leaves the process.
 */
export function createE2ePangolin(): IPangolinClient {
  return {
    async mintResourceAccessToken() {
      return { id: randomUUID(), secret: randomUUID() };
    },
    async deleteResourceAccessToken() {
      return Promise.resolve();
    }
  };
}
