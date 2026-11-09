export enum LiveEventFailure {
  Refused = 'refused',
  Dropped = 'dropped'
}

export interface LiveEventSource {
  readonly uri: string;
  readonly headers: Record<string, string>;
}

export interface LiveEventHandlers {
  onOpen(): void;
  onMessage(data: string): void;
  onError(failure: LiveEventFailure): void;
}

export interface LiveEventConnection {
  close(): void;
}

export type LiveEventFactory = (
  source: LiveEventSource,
  handlers: LiveEventHandlers
) => LiveEventConnection;

/* A frame ends on a blank line; one with no `data:` line is a comment or event
 * name, so it carries nothing to hand over. */
export function createFrameReader(
  onData: (data: string) => void
): (chunk: string) => void {
  let buffer = '';

  return chunk => {
    buffer += chunk;

    for (;;) {
      const end = buffer.indexOf('\n\n');

      if (end < 0) {
        return;
      }

      const frame = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);

      const data = dataOf(frame);

      if (data !== null) {
        onData(data);
      }
    }
  };
}

function dataOf(frame: string): string | null {
  const lines = frame
    .split('\n')
    .filter(line => line.startsWith('data:'))
    .map(line => line.slice('data:'.length).replace(/^ /, ''));

  return lines.length === 0 ? null : lines.join('\n');
}
