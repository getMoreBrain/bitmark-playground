import * as parser from '@gmb/bitmark-parser';
import { act, render } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { createBitmarkEngine } from '../engine/createBitmarkEngine';
import type { BitmarkEngine, RawParserModule } from '../engine/types';
import type { BitmarkPane as Pane } from '../session/types';
import { createFakeMonaco, FakeModel } from '../testing/fakeMonaco';
import { BitmarkPane, BitmarkSession } from './index';

let engine: BitmarkEngine;
beforeAll(async () => {
  await parser.init({ feature: 'full' });
  engine = createBitmarkEngine(parser as unknown as RawParserModule, { feature: 'full' });
});

const DOC = '[.article]\nHello **World**!';

describe('React adapter (PLAN-022 D3)', () => {
  it('mounts panes under a session, keeps them in sync, and reports changes', async () => {
    const { monaco } = createFakeMonaco();
    const panes: Record<string, Pane | undefined> = {};
    const onChange = vi.fn();
    const view = render(
      <BitmarkSession
        monaco={monaco}
        engine={engine}
        value={DOC}
        schema={false}
        onChange={onChange}
      >
        <BitmarkPane type="bitmark" onPane={(p) => (panes.bitmark = p)} />
        <BitmarkPane type="json" readOnly onPane={(p) => (panes.json = p)} />
      </BitmarkSession>,
    );
    await vi.waitFor(() => expect(panes.json?.textEditor.getValue()).toContain('World'));
    expect(panes.json!.readOnly).toBe(true);
    act(() => (panes.bitmark!.textEditor.model as FakeModel).setText('[.article]\nFrom React'));
    await vi.waitFor(() => expect(panes.json!.textEditor.getValue()).toContain('From React'));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ bitmark: '[.article]\nFrom React' }),
    );

    // A new `value` from outside replaces the document.
    view.rerender(
      <BitmarkSession
        monaco={monaco}
        engine={engine}
        value={'[.article]\nFrom props'}
        schema={false}
      >
        <BitmarkPane type="bitmark" onPane={(p) => (panes.bitmark = p)} />
        <BitmarkPane type="json" readOnly={false} onPane={(p) => (panes.json = p)} />
      </BitmarkSession>,
    );
    await vi.waitFor(() => expect(panes.json!.textEditor.getValue()).toContain('From props'));
    expect(panes.json!.readOnly).toBe(false);
    view.unmount();
    expect(panes.json).toBeUndefined();
  });
});

describe('React adapter: controlled value (second review)', () => {
  it('does not roll the document back to its own lagging value', async () => {
    const { monaco } = createFakeMonaco();
    let bitmarkPane: Pane | undefined;
    const view = render(
      <BitmarkSession monaco={monaco} engine={engine} value={DOC} schema={false}>
        <BitmarkPane type="bitmark" onPane={(p) => (bitmarkPane = p)} />
      </BitmarkSession>,
    );
    await vi.waitFor(() => expect(bitmarkPane).toBeDefined());
    // Two edits, each committed (and reported) before the host re-renders.
    await act(async () => {
      (bitmarkPane!.textEditor.model as FakeModel).setText('[.article]\nX1');
      await new Promise((r) => setTimeout(r, 0));
      (bitmarkPane!.textEditor.model as FakeModel).setText('[.article]\nX2');
      await new Promise((r) => setTimeout(r, 0));
    });
    // The host's state is one change behind: it re-renders with X1.
    view.rerender(
      <BitmarkSession monaco={monaco} engine={engine} value={'[.article]\nX1'} schema={false}>
        <BitmarkPane type="bitmark" onPane={(p) => (bitmarkPane = p)} />
      </BitmarkSession>,
    );
    await new Promise((r) => setTimeout(r, 10));
    expect(bitmarkPane!.textEditor.getValue()).toBe('[.article]\nX2');
    view.unmount();
  });
});
