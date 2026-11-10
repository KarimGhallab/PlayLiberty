import type { Transport } from './transport/transport.js';

let configured: Transport | null = null;

/** The app calls this once, beside the transport it built. */
export function configureApiClient(transport: Transport): void {
  configured = transport;
}

export function apiClient(): Transport {
  if (configured === null) {
    throw new Error('No API client is configured.');
  }

  return configured;
}
