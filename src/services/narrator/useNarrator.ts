import { useSyncExternalStore } from 'react';
import { narrator } from './narrator';

export function useNarrator() {
  const state = useSyncExternalStore(narrator.subscribe, narrator.getSnapshot);
  return { state, narrator };
}
