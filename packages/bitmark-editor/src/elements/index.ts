// The custom elements (PLAN-020 D3). Importing this module defines them
// (in a browser; a no-op during server rendering).
import { defineBitmarkElements } from './elements';

defineBitmarkElements();

export { getDefaultEngine, loadDefaultMonaco, setDefaultEngine, setMonacoLoader } from './defaults';
export type {
  BitmarkPaneElementApi,
  BitmarkSessionElementApi,
  LazyMode,
  NarrowMode,
} from './elements';
export { defineBitmarkElements, ELEMENTS_CSS, isNarrowTouch } from './elements';
