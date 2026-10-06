import { MONACO_THEME } from '@gmb/bitmark-editor';
import { editor } from 'monaco-editor';
import { useCallback } from 'react';
import { Flex } from 'theme-ui';
import { useSnapshot } from 'valtio';

import { usePinnedScrollSync } from '../../scrollSync/useScrollSync';
import { useBitmarkConverter } from '../../services/BitmarkConverter';
import { keepsMounted, RIGHT_SESSION_TABS, SessionPaneTab } from '../../session/PlaygroundSession';
import { bitmarkState, TAB_LABEL } from '../../state/bitmarkState';
import { MonacoTextArea, MonacoTextAreaUncontrolledProps } from '../monaco/MonacoTextArea';
import { WasmCheckPanel } from './WasmCheckPanel';

const DEFAULT_MONACO_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  //
};

export interface BitmarkJsonTextBoxProps extends MonacoTextAreaUncontrolledProps {
  //
}

const BitmarkJsonTextBox = (props: BitmarkJsonTextBoxProps) => {
  const { options, ...restProps } = props;
  const bitmarkStateSnap = useSnapshot(bitmarkState);
  const { jsLoadSuccess, jsLoadError, wasmLoadSuccess, wasmLoadError, jsonToMarkup } =
    useBitmarkConverter();

  const activeTab = bitmarkStateSnap.activeJsonTab;

  // Hooks run on every render; the session panes link themselves.
  const { onMount, onUnmount } = usePinnedScrollSync(
    bitmarkStateSnap.js.jsonAsString,
    bitmarkStateSnap.js.jsonBitStarts,
  );

  // At least one parser must be loaded
  const anyLoadSuccess = jsLoadSuccess || wasmLoadSuccess;
  const allLoadError = jsLoadError && wasmLoadError;

  const onInput = useCallback(
    async (json: string) => {
      bitmarkState.setLastEdit('json', json, `${TAB_LABEL.js} JSON`);
      await jsonToMarkup('js', json);
    },
    [jsonToMarkup],
  );

  // The timed ones stay mounted (hidden when inactive), so each tab's duration stays current.
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
      {activeTab === 'js' || activeTab === 'wasmCheck' ? ownTab() : null}
    </>
  );

  /** The tabs the playground renders itself. */
  function ownTab() {
    if (activeTab === 'wasmCheck') {
      return (
        <WasmCheckPanel
          markup={bitmarkStateSnap.wasmCheck.markup}
          errorAsString={bitmarkStateSnap.wasmCheck.markupErrorAsString}
        />
      );
    }

    const activeSlice = bitmarkStateSnap.js;

    if (anyLoadSuccess) {
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
          editorDidMount={onMount}
          editorWillUnmount={onUnmount}
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
        {allLoadError ? 'Load failed.' : 'Loading...'}
      </Flex>
    );
  }
};

export { BitmarkJsonTextBox };
