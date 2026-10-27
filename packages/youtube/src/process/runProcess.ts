import type { ChildProcess } from 'node:child_process';
import { spawn } from 'node:child_process';

import type { ProcessTracker } from '../types.js';

export interface RunResult {
  stdout: string;
  stderr: string;
}

function killProcessTree(child: ChildProcess): void {
  if (child.pid === undefined) {
    return;
  }
  try {
    process.kill(-child.pid, 'SIGKILL');
  } catch {
    child.kill('SIGKILL');
  }
}

/* A child that outlives its timeout is killed with its group, so a tool that
 * spawned its own children leaves nothing behind. */
export function runProcess(
  command: string,
  args: string[],
  timeoutMs: number,
  track?: ProcessTracker
): Promise<RunResult> {
  return new Promise<RunResult>((resolve, reject) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let settled = false;
    const release = track?.(child);

    const finish = (): void => {
      settled = true;
      clearTimeout(timer);
      release?.();
    };

    const timer = setTimeout(() => {
      finish();
      killProcessTree(child);
      reject(new Error(`${command} timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    child.stdout?.on('data', chunk => {
      stdout += String(chunk);
    });
    child.stderr?.on('data', chunk => {
      stderr += String(chunk);
    });
    child.on('error', error => {
      if (settled) {
        return;
      }
      finish();
      reject(error);
    });
    child.on('close', code => {
      if (settled) {
        return;
      }
      finish();
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(
        new Error(
          `${command} exited with code ${String(code)}: ${stderr.trim()}`
        )
      );
    });
  });
}
