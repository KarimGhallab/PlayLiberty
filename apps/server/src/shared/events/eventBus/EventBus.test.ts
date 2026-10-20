import { describe, expect, it, vi } from 'vitest';

import { EventBus } from './EventBus.js';

/*
 * The bus is the transport's fan-out: a connection subscribes on an account
 * and a publisher names who hears it. Four properties, driven with a string.
 */

describe('EventBus', () => {
  it('delivers a payload to a listener on its own channel', () => {
    const bus = new EventBus<string>();
    const listener = vi.fn();
    bus.subscribe('account-1', listener);

    bus.publish('changed', ['account-1']);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith('changed');
  });

  it('does not deliver to a channel with no listener', () => {
    const bus = new EventBus<string>();
    const listener = vi.fn();
    bus.subscribe('account-1', listener);

    bus.publish('changed', ['account-2']);

    expect(listener).not.toHaveBeenCalled();
  });

  it('delivers once when an audience repeats a channel', () => {
    const bus = new EventBus<string>();
    const listener = vi.fn();
    bus.subscribe('account-1', listener);

    bus.publish('changed', ['account-1', 'account-1']);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('delivers to every listener on a channel', () => {
    const bus = new EventBus<number>();
    const first = vi.fn();
    const second = vi.fn();
    bus.subscribe('account-1', first);
    bus.subscribe('account-1', second);

    bus.publish(7, ['account-1']);

    expect(first).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledWith(7);
    expect(second).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledWith(7);
  });

  it('stops delivering once the unsubscribe runs', () => {
    const bus = new EventBus<string>();
    const listener = vi.fn();
    const unsubscribe = bus.subscribe('account-1', listener);

    unsubscribe();
    bus.publish('changed', ['account-1']);

    expect(listener).not.toHaveBeenCalled();
  });

  it('leaves the other listeners on a channel after one unsubscribes', () => {
    const bus = new EventBus<string>();
    const staying = vi.fn();
    const leaving = vi.fn();
    bus.subscribe('account-1', staying);
    const unsubscribe = bus.subscribe('account-1', leaving);

    unsubscribe();
    bus.publish('changed', ['account-1']);

    expect(staying).toHaveBeenCalledTimes(1);
    expect(staying).toHaveBeenCalledWith('changed');
    expect(leaving).not.toHaveBeenCalled();
  });
});
