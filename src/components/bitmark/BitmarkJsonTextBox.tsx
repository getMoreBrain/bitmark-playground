import { MONACO_THEME } from '@gmb/bitmark-editor';
import { editor } from 'monaco-editor';
import { useCallback, useState } from 'react';
import { EditorDidMount, EditorWillUnmount } from 'react-monaco-editor';
import { Flex } from 'theme-ui';
import { useSnapshot } from 'valtio';

import { usePinnedScrollSync } from '../../scrollSync/useScrollSync';
import { SearchEditor, useSearchTarget } from '../../search';
import { jsonTabLabel } from '../../search/labels';
import { useBitmarkConverter } from '../../services/BitmarkConverter';
import { keepsMounted, RIGHT_SESSION_TABS, SessionPaneTab } from '../../session/PlaygroundSession';
import { bitmarkState, JSON_TAB_LABEL } from '../../state/bitmarkState';
import { MonacoTextArea, MonacoTextAreaUncontrolledProps } from '../monaco/MonacoTextArea';

const DEFAULT_MONACO_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  //
};

export interface BitmarkJsonTextBoxProps extends MonacoTextAreaUncontrolledProps {
  //
}

const BitmarkJsonTextBox = (props: BitmarkJsonTextBoxProps) => {
  const { options, ...restProps } = props;
  const bitmarkStateSnap = useSnapshot(bitmarkState);
  const { jsLoadSuccess, jsLoadError, jsonToMarkup } = useBitmarkConverter();

  const activeTab = bitmarkStateSnap.activeJsonTab;

  // Hooks run on every render; the session panes link themselves.
  const { onMount, onUnmount } = usePinnedScrollSync(
    bitmarkStateSnap.js.jsonAsString,
    bitmarkStateSnap.js.jsonBitStarts,
  );

  // The Legacy JSON editor (the session panes register themselves).
  const [searchEditor, setSearchEditor] = useState<SearchEditor>();
  useSearchTarget('right', jsonTabLabel('legacy'), searchEditor);
  const editorDidMount = useCallback<EditorDidMount>(
    (editor) => {
      onMount(editor);
      setSearchEditor(editor);
    },
    [onMount],
  );
  const editorWillUnmount = useCallback<EditorWillUnmount>(() => {
    onUnmount();
    setSearchEditor(undefined);
  }, [onUnmount]);

  const onInput = useCallback(
    async (json: string) => {
      bitmarkState.setLastEdit('json', json, JSON_TAB_LABEL.legacy);
      await jsonToMarkup('js', json);
    },
    [jsonToMarkup],
  );

  // The timed ones stay mounted (hidden when inactive), so each tab's
  // duration stays current and the search finds their text.
  const sessionPanes = RIGHT_SESSION_TABS.filter(
    (tab) => tab === activeTab || keepsMounted(tab),
  ).map((tab) => (
    <SessionPaneTab
      key={tab}
      tab={tab}
      hidden={tab !== activeTab}
      className={tab === activeTab ? (restProps.className ?? undefined) : undefined}
    />
  ));

  return (
    <>
      {sessionPanes}
      {activeTab === 'legacy' ? legacyTab() : null}
    </>
  );

  /** The Legacy JSON tab, which the playground renders itself. */
  function legacyTab() {
    const activeSlice = bitmarkStateSnap.js;

    if (jsLoadSuccess) {
      const opts = {
        ...DEFAULT_MONACO_OPTIONS,
        ...options,
      };

      const value = activeSlice.jsonErrorAsString ?? activeSlice.jsonAsString;
      return (
        <MonacoTextArea
          {...restProps}
          theme={MONACO_THEME}
          language="json"
          value={value}
          options={opts}
          onInput={onInput}
          editorDidMount={editorDidMount}
          editorWillUnmount={editorWillUnmount}
        />
      );
    }
    return (
      <Flex
        sx={{
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        {jsLoadError ? 'Load failed.' : 'Loading legacy parser...'}
      </Flex>
    );
  }
};

export { BitmarkJsonTextBox };
