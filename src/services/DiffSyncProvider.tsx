import { createContext, ReactElement, ReactNode, useContext, useEffect, useState } from 'react';

import { uiState } from '../state/uiState';
import { useBitmarkParser } from './BitmarkParser';
import { DiffSync, startDiffSync } from './diffSync';
import { inlineStyleOption } from './inlineStyle';

const DiffSyncContext = createContext<DiffSync | undefined>(undefined);

/** The Diff panes' sync (PLAN-032), once the parser is loaded. Mount inside `BitmarkParserProvider`. */
export const DiffSyncProvider = ({ children }: { children: ReactNode }): ReactElement => {
  const { patcher, version } = useBitmarkParser();
  const [sync, setSync] = useState<DiffSync>();
  useEffect(() => {
    if (!patcher) return;
    // Toggle tags or classic marks, as the setting and parser version say (PLAN-035 D3).
    const started = startDiffSync(patcher, () => inlineStyleOption(version, uiState.toggleTags));
    setSync(started);
    return () => {
      started.dispose();
      setSync(undefined);
    };
  }, [patcher, version]);
  return <DiffSyncContext.Provider value={sync}>{children}</DiffSyncContext.Provider>;
};

export const useDiffSync = (): DiffSync | undefined => useContext(DiffSyncContext);
