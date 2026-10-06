// @awa-component: PLAN-021-Bundled
// The Monaco half of `/bundled` (PLAN-020 D4): loaded only when a session
// starts, so a lazy page pays nothing before its trigger (D12).
import 'monaco-editor/esm/vs/language/json/monaco.contribution';
import 'monaco-editor/esm/vs/basic-languages/html/html.contribution';
import 'monaco-editor/esm/vs/basic-languages/xml/xml.contribution';
import 'monaco-editor/esm/vs/editor/contrib/suggest/browser/suggestController';
import 'monaco-editor/esm/vs/editor/contrib/hover/browser/hoverContribution';
import 'monaco-editor/esm/vs/base/browser/ui/codicons/codiconStyles';

import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

export { monaco };
