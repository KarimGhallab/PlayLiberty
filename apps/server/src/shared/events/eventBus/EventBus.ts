/*
 * The in-process bus a feature publishes a live event to and the events route
 * subscribes a connection on. It is one map of channel to listeners, where the
 * channel is an account id: a connection subscribes on the account the edge
 * identified, and a publisher names the accounts that should hear the event, so
 * a listener never receives a fact about a playlist it cannot see.
 *
 * It is generic over the payload rather than typed to the live event, so it
 * carries no domain vocabulary and a test drives it with a number. The process
 * is one, so the bus is one object in the context; a second replica would need a
 * shared bus, which is a change for the day there is a second replica.
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

  /*
   * Deliver one payload to every listener on the named channels. A channel with
   * no listener costs a map lookup, and a channel named twice is delivered once,
   * so a publisher may pass an audience that repeats an id without a listener
   * seeing the same event twice.
   */
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
