import { randomUUID } from 'node:crypto';

import type { IPangolinClient } from '../../../shared/pangolin.js';

/* The edge's integration API, faked: the browser provisions without Pangolin,
 * and the minted token is a process-local uuid. */
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
