// @awa-component: PLAN-018-ScrollSync
import { subscribeKey } from 'valtio/utils';

import {
  createScrollSyncGroup,
  ScrollSyncEditor,
  ScrollSyncGroup,
  ScrollSyncMember,
} from '../lib/scroll';
import { uiState } from '../state/uiState';

/**
 * The playground's one scroll group (PLAN-021 Step 5): the bitmark editor and
 * whichever right-hand tab is mounted. "Link scrolling" (`uiState.linkScroll`)
 * links or unlinks every member at once.
 */
let group: ScrollSyncGroup = createScrollSyncGroup();

/** Add a pane to the playground's group, linked as the toggle says. */
// @awa-impl: PLAN-021-Step5 (the playground's panes join one group)
export const joinScrollSync = (
  editor: ScrollSyncEditor,
  bitStarts: () => readonly number[],
): ScrollSyncMember => group.join(editor, bitStarts, { linked: uiState.linkScroll });

// @awa-impl: PLAN-018-Step6 (the toggle links / unlinks; linking re-syncs)
subscribeKey(uiState, 'linkScroll', (on) => {
  for (const member of group.members()) member.setLinked(on);
});

/** A fresh group. Only for tests. */
export const resetScrollSync = (): void => {
  group = createScrollSyncGroup();
};
