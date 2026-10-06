// @awa-component: PLAN-023-Bundled
// The Monaco half of `/bundled` (PLAN-022 D4): loaded only when a session
// starts, so a lazy page pays nothing before its trigger (D12).
// Monaco 0.57 module paths (its "exports" map `monaco-editor/*` to `esm/vs/*`).
import 'monaco-editor/languages/definitions/html/register';
import 'monaco-editor/languages/definitions/xml/register';
import 'monaco-editor/editor/contrib/suggest/browser/suggestController';
import 'monaco-editor/editor/contrib/hover/browser/hoverContribution';
import 'monaco-editor/features/codicon/register';

import * as api from 'monaco-editor/editor/editor.api';
import * as json from 'monaco-editor/language/json/monaco.contribution';

import type { Monaco } from '../monaco/types';

/** The editor API with the JSON language's defaults at `monaco.json`, as 0.55+ has them. */
export const monaco = { ...api, json } as unknown as Monaco;
