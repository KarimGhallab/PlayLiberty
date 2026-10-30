import type { FastifyBaseLogger } from 'fastify';

export type LogLine = Record<string, unknown>;

/* A logger recording app output, injected as Fastify's logger so hooks and
 * routes logging on `request.log` land here. */
export function recordingLogger(): {
  logger: FastifyBaseLogger;
  lines: LogLine[];
} {
  const lines: LogLine[] = [];

  const record =
    (level: string) =>
    (payload: Record<string, unknown>, message?: string): void => {
      lines.push({ level, message, ...payload });
    };

  const logger = {
    level: 'info',
    info: record('info'),
    warn: record('warn'),
    error: record('error'),
    debug: record('debug'),
    fatal: record('fatal'),
    trace: record('trace'),
    child: (): unknown => logger
  } as unknown as FastifyBaseLogger;

  return { logger, lines };
}
