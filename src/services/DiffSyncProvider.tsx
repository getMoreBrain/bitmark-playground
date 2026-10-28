import { createContext, ReactElement, ReactNode, useContext, useEffect, useState } from 'react';

import { useBitmarkParser } from './BitmarkParser';
import { DiffSync, startDiffSync } from './diffSync';

const DiffSyncContext = createContext<DiffSync | undefined>(undefined);

/** The Diff panes' sync (PLAN-032), once the parser is loaded. Mount inside `BitmarkParserProvider`. */
export const DiffSyncProvider = ({ children }: { children: ReactNode }): ReactElement => {
  const { patcher } = useBitmarkParser();
  const [sync, setSync] = useState<DiffSync>();
  useEffect(() => {
    if (!patcher) return;
    const started = startDiffSync(patcher);
    setSync(started);
    return () => {
      started.dispose();
      setSync(undefined);
    };
  }, [patcher]);
  return <DiffSyncContext.Provider value={sync}>{children}</DiffSyncContext.Provider>;
};

export const useDiffSync = (): DiffSync | undefined => useContext(DiffSyncContext);
