import { attachSyncView, SyncView, SyncViewEditor } from '@gmb/bitmark-editor';
import { subscribeKey } from 'valtio/utils';

import { uiState } from '../state/uiState';

/**
 * A playground member's guide line and block highlight (PLAN-033 D3), drawn
 * as the session's panes draw theirs, and switched by Settings' "Guide line"
 * and "Block highlight". `host` holds the guide line and is made a
 * positioned element if it is not one; it must be as tall as the editor.
 */
export const attachPlaygroundSyncView = (editor: SyncViewEditor, host: HTMLElement): SyncView => {
  const { position } = getComputedStyle(host);
  if (!position || position === 'static') host.style.position = 'relative';
  const view = attachSyncView(editor, host, {
    syncLine: () => uiState.syncLine,
    syncMatch: () => uiState.syncMatch,
  });
  const offs = [
    subscribeKey(uiState, 'syncLine', view.refresh),
    subscribeKey(uiState, 'syncMatch', view.refresh),
  ];
  return {
    ...view,
    dispose: () => {
      for (const off of offs) off();
      view.dispose();
    },
  };
};
