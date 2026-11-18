import { createContext } from 'react';
export const AppearanceContext = createContext<{ enabled: boolean; replayKey: string; sequential?: boolean }>({ enabled: true, replayKey: 'initial' });
