import pino from 'pino';

/* Colored logs in a terminal, JSON elsewhere. `pino-pretty` is a devDependency
 * named only as a transport target, which is why knip leaves it alone. */
const level = process.env.LOG_LEVEL ?? 'info';
const pretty =
  process.env.NODE_ENV !== 'production' && process.stdout.isTTY === true;

export const logger = pino(
  pretty
    ? {
        level,
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss.l',
            ignore: 'pid,hostname'
          }
        }
      }
    : { level }
);
