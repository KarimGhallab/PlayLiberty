import { setupServer } from 'msw/node';

import { handlers } from './handlers';

/** The Node-side MSW server the Vitest setup starts and stops. */
export const server = setupServer(...handlers);
