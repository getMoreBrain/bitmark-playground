/** @jsxImportSource theme-ui */
import { useSnapshot } from 'valtio';

import { bitmarkState } from '../../state/bitmarkState';

/** The WASM lexer's tokens for the Bitmark tab (PLAN-026 D8). */
const LexerPanel = () => {
  const { lexerOutput } = useSnapshot(bitmarkState);
  return (
    <pre
      sx={{
        margin: 0,
        padding: 2,
        fontFamily: 'monospace',
        fontSize: '13px',
        color: 'text',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        overflow: 'auto',
        flexGrow: 1,
      }}
    >
      {lexerOutput}
    </pre>
  );
};

export { LexerPanel };
