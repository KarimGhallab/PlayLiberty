import type { EgressAgentStatus } from '@playliberty/youtube';

import { startAgent } from './agent/server.js';
import { readStatus } from './agent/status.js';

const DEFAULT_SOCKET = '/run/playliberty/egress-agent.sock';
const DEFAULT_PEER_UID = 1000;

function required(name: string, value: string | undefined): string {
  if (value === undefined || value.length === 0) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

async function main(): Promise<void> {
  const poolDirectory = required(
    'PROTON_POOL_DIR',
    process.env.PROTON_POOL_DIR
  );
  const socketPath = process.env.EGRESS_AGENT_SOCKET ?? DEFAULT_SOCKET;
  const peerUid = Number.parseInt(
    process.env.EGRESS_AGENT_PEER_UID ?? String(DEFAULT_PEER_UID),
    10
  );

  if (!Number.isInteger(peerUid) || peerUid < 0) {
    throw new Error('EGRESS_AGENT_PEER_UID must be a non-negative integer.');
  }

  const loadedSince = new Date().toISOString();
  const status = (): Promise<EgressAgentStatus> =>
    readStatus({
      poolDirectory,
      activeOverride: process.env.PROTON_ACTIVE_CONFIG,
      loadedSince
    });

  /* Parse before listening: a broken pool or a misfiled active name is a boot
   * failure with a message, not a socket that answers 500 forever. */
  await status();

  if (process.argv.includes('--dry-run')) {
    console.log(JSON.stringify(await status(), null, 2));
    return;
  }

  const handle = await startAgent({
    socketPath,
    peerUid,
    status
  });

  const log = (event: string): void => {
    console.log(
      JSON.stringify({ at: new Date().toISOString(), event, socketPath })
    );
  };

  log('agent_started');

  const stop = (): void => {
    void handle.close().then(() => process.exit(0));
  };

  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
