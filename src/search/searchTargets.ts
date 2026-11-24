import { createSearchTargets } from '@gmb/bitmark-editor';

/** Where a pane is on screen; also the order panes are listed in. */
export type SearchArea = 'left' | 'middle' | 'right' | 'bottomLeft' | 'bottomRight';
const AREA_ORDER: readonly SearchArea[] = [
  'left',
  // The Final Bitmark panel (PLAN-032 D2).
  'middle',
  'right',
  'bottomLeft',
  'bottomRight',
];

/** The editors the search can see, registered by the components that mount them (PLAN-024). */
export const searchTargets = createSearchTargets(AREA_ORDER);
