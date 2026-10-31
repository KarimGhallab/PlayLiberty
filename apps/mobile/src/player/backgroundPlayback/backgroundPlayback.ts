import { requireOptionalNativeModule } from 'expo';

import type { BackgroundPlaybackState } from './backgroundPlaybackState/backgroundPlaybackState';

export type BackgroundCommand = 'toggle' | 'play' | 'pause';

interface NativeSubscription {
  remove(): void;
}

interface NativeBackgroundPlayback {
  start(state: BackgroundPlaybackState): Promise<boolean>;
  update(state: BackgroundPlaybackState): void;
  stop(): void;
  addListener(
    eventName: 'onCommand',
    listener: (event: { readonly command: string }) => void
  ): NativeSubscription;
}

export interface BackgroundPlaybackClient {
  start(state: BackgroundPlaybackState): Promise<boolean>;
  update(state: BackgroundPlaybackState): void;
  stop(): void;
  addCommandListener(
    listener: (command: BackgroundCommand) => void
  ): NativeSubscription;
}

const native =
  requireOptionalNativeModule<NativeBackgroundPlayback>('BackgroundPlayback');

/* Android only. On another platform the module is absent and the player keeps
 * its foreground behaviour, so every call is optional. */
export const backgroundPlayback: BackgroundPlaybackClient | null = native
  ? {
      start: state => native.start(state),
      update: state => native.update(state),
      stop: () => native.stop(),
      addCommandListener: listener =>
        native.addListener('onCommand', event =>
          listener(event.command as BackgroundCommand)
        )
    }
  : null;
