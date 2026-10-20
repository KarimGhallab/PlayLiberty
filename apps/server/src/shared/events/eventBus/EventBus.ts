/*
 * The in-process bus a feature publishes a live event to and the events route
 * subscribes on; the channel is an account id, so a publisher names accounts
 * that should hear the event and a listener never receives an invisible fact.
 */
export type EventListener<TPayload> = (payload: TPayload) => void;

export class EventBus<TPayload> {
  private readonly _listeners = new Map<string, Set<EventListener<TPayload>>>();

  /** Listen on one channel. The returned function is the unsubscribe. */
  subscribe(channel: string, listener: EventListener<TPayload>): () => void {
    const listeners = this._listeners.get(channel) ?? new Set();
    listeners.add(listener);
    this._listeners.set(channel, listeners);

    return () => {
      listeners.delete(listener);

      if (listeners.size === 0) {
        this._listeners.delete(channel);
      }
    };
  }

  /* A channel named twice is delivered once, so a publisher may pass a repeated
   * audience. */
  publish(payload: TPayload, channels: Iterable<string>): void {
    const delivered = new Set<string>();

    for (const channel of channels) {
      if (delivered.has(channel)) {
        continue;
      }

      delivered.add(channel);

      const listeners = this._listeners.get(channel);

      if (listeners === undefined) {
        continue;
      }

      for (const listener of listeners) {
        listener(payload);
      }
    }
  }
}
