import { describe, expect, it, vi } from 'vitest';

import { createFakeMonaco, FakeModel } from '../testing/fakeMonaco';
import { createChangeFilter, createTextEditor, replaceAllKeepingUndo } from './textEditor';

describe('createChangeFilter', () => {
  it('passes a changed value once, then drops repeats of it', () => {
    const filter = createChangeFilter('a');
    expect(filter.changed('ab')).toBe(true);
    // One input applied as many edits: every event reads the same final text.
    expect(filter.changed('ab')).toBe(false);
    expect(filter.changed('ab')).toBe(false);
    expect(filter.changed('abc')).toBe(true);
  });

  it('drops the initial value, and passes a return to an earlier one', () => {
    const filter = createChangeFilter('a');
    expect(filter.changed('a')).toBe(false);
    expect(filter.changed('ab')).toBe(true);
    expect(filter.changed('a')).toBe(true);
  });

  it('counts a programmatic change as held, not reported', () => {
    const filter = createChangeFilter('a');
    filter.set('generated');
    expect(filter.changed('generated')).toBe(false);
    expect(filter.changed('a')).toBe(true);
  });
});

describe('createTextEditor (PLAN-023 Step 6)', () => {
  const setup = (value = 'start') => {
    const fake = createFakeMonaco();
    const onInput = vi.fn();
    const text = createTextEditor(document.createElement('div'), {
      monaco: fake.monaco,
      value,
      language: 'json',
      kind: 'json',
      extension: 'json',
      onInput,
    });
    return { fake, text, onInput, model: text.model as FakeModel, state: fake.editors[0]! };
  };

  it('creates its model under the package URI scheme', () => {
    const { model } = setup();
    expect(model.uri.toString()).toMatch(/^bitmark-editor:\/\/editor-\d+\/json\.json$/);
  });

  it('reports user edits, once per distinct value', () => {
    const { model, onInput } = setup();
    model.setText('one');
    model.setText('one');
    model.setText('two');
    expect(onInput.mock.calls.map((c) => c[0])).toEqual(['one', 'two']);
  });

  it('does not report its own programmatic value as input', () => {
    const { text, onInput } = setup();
    expect(text.setValue('generated')).toBe(true);
    expect(text.getValue()).toBe('generated');
    expect(onInput).not.toHaveBeenCalled();
  });

  it('leaves a focused editor alone', () => {
    const { text, state } = setup();
    state.focused = true;
    expect(text.setValue('generated')).toBe(false);
    expect(text.getValue()).toBe('start');
  });

  it('keeps the undo history through regeneration', () => {
    const { text, model } = setup('a');
    model.setText('typed');
    text.setValue('regenerated');
    model.undo();
    expect(text.getValue()).toBe('typed');
    model.undo();
    expect(text.getValue()).toBe('a');
  });

  it('switches read-only, lays out, and disposes editor and model', () => {
    const { text, state, model } = setup();
    text.setReadOnly(true);
    expect(state.options['readOnly']).toBe(true);
    text.layout();
    text.dispose();
    expect(state.disposed).toBe(true);
    expect(model.disposed).toBe(true);
  });

  it('skips a replace that changes nothing', () => {
    const fake = createFakeMonaco();
    const model = fake.monaco.editor.createModel('same', 'json') as FakeModel;
    replaceAllKeepingUndo(model, 'same');
    model.undo();
    expect(model.getValue()).toBe('same');
  });
});
