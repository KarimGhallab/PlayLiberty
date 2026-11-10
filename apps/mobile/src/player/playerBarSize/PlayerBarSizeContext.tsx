import {
  type ReactNode,
  createContext,
  useContext,
  useMemo,
  useState
} from 'react';

import { playerBarHeight } from './playerBarSize';

interface PlayerBarSize {
  readonly height: number;
  readonly setHeight: (height: number) => void;
}

/* The screens pay this height under their last row; the bar publishes it when
 * its content, not a constant, decides the height. */
const PlayerBarSizeContext = createContext<PlayerBarSize>({
  height: playerBarHeight,
  setHeight: () => {}
});

export function PlayerBarSizeProvider({
  children
}: {
  readonly children: ReactNode;
}) {
  const [height, setHeight] = useState(playerBarHeight);
  const value = useMemo(() => ({ height, setHeight }), [height]);

  return (
    <PlayerBarSizeContext.Provider value={value}>
      {children}
    </PlayerBarSizeContext.Provider>
  );
}

export function usePlayerBarHeight(): number {
  return useContext(PlayerBarSizeContext).height;
}

export function useSetPlayerBarHeight(): (height: number) => void {
  return useContext(PlayerBarSizeContext).setHeight;
}
