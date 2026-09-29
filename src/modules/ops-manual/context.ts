import { createContext, useContext } from 'react';
import type { Chapter } from './manualIndex';
import type { Lens } from './lens';

/** What a directive inside a chapter needs to know: which chapter, whose lens. */
export interface ManualCtxValue { chapter?: Chapter; lens: Lens }
export const ManualCtx = createContext<ManualCtxValue>({ lens: 'all' });
export const useManualCtx = () => useContext(ManualCtx);
