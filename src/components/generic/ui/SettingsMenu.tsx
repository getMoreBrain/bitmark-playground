/** @jsxImportSource theme-ui */
import { ReactNode, useCallback, useEffect, useRef } from 'react';
import { Box, Flex, Label, Text } from 'theme-ui';
import { useSnapshot } from 'valtio';

import { uiState } from '../../../state/uiState';
import { LegacyParserHint } from './LegacyParserHint';

interface OptionProps {
  type: 'checkbox' | 'radio';
  name?: string;
  title?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}

/** One setting: a labelled checkbox or radio button. */
const Option = ({ type, name, title, checked, onChange, children }: OptionProps) => (
  <Flex sx={{ alignItems: 'center', gap: 2, mt: 1 }}>
    <Label
      title={title}
      sx={{
        cursor: 'pointer',
        fontSize: 1,
        color: 'text',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        width: 'auto',
      }}
    >
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: '#7dc13a' }}
      />
      {children}
    </Label>
  </Flex>
);

const SettingsMenu = () => {
  const snap = useSnapshot(uiState);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && uiState.settingsOpen) {
      uiState.setSettingsOpen(false);
    }
  }, []);

  // Close on click outside
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      uiState.setSettingsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (snap.settingsOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [snap.settingsOpen, handleKeyDown, handleClickOutside]);

  return (
    <Box ref={containerRef} sx={{ position: 'relative', zIndex: 1000, alignSelf: 'stretch' }}>
      <Flex
        role="button"
        aria-label="Settings"
        aria-expanded={snap.settingsOpen}
        onClick={() => uiState.setSettingsOpen(!uiState.settingsOpen)}
        sx={{
          cursor: 'pointer',
          height: '100%',
          alignItems: 'center',
          px: 2,
          color: 'muted',
          userSelect: 'none',
          '&:hover': { color: 'primary' },
        }}
      >
        <Text sx={{ fontSize: 4, lineHeight: 1 }}>⚙</Text>
      </Flex>

      <LegacyParserHint />

      {snap.settingsOpen && (
        <Box
          sx={{
            position: 'absolute',
            top: '100%',
            right: 0,
            minWidth: 200,
            backgroundColor: 'backgroundLight',
            border: '1px solid',
            borderColor: 'accent',
            borderRadius: 4,
            p: 2,
            mt: '2px',
          }}
        >
          <Text sx={{ color: 'primary', fontSize: 1, fontWeight: 'bold', display: 'block' }}>
            Settings
          </Text>

          <Box
            as="hr"
            sx={{ border: 'none', borderTop: '1px solid', borderColor: 'accent', my: 2 }}
          />

          <Text sx={{ color: 'muted', fontSize: 0, fontWeight: 'bold', mb: 1, display: 'block' }}>
            UI
          </Text>

          <Option
            type="checkbox"
            checked={snap.showBottomPanels}
            onChange={(checked) => uiState.setShowBottomPanels(checked)}
          >
            Show bottom panels
          </Option>
          <Option
            type="checkbox"
            checked={snap.linkScroll}
            onChange={(checked) => uiState.setLinkScroll(checked)}
          >
            Link scrolling
          </Option>

          <Text
            sx={{ color: 'muted', fontSize: 0, fontWeight: 'bold', mt: 2, mb: 1, display: 'block' }}
          >
            Parser
          </Text>

          <Flex sx={{ gap: 3 }}>
            <Option
              type="radio"
              name="output"
              title="WASM parser: optimised output"
              checked={!snap.fullOutput}
              onChange={(checked) => checked && uiState.setFullOutput(false)}
            >
              Optimised
            </Option>
            <Option
              type="radio"
              name="output"
              title="WASM parser: full output"
              checked={snap.fullOutput}
              onChange={(checked) => checked && uiState.setFullOutput(true)}
            >
              Full
            </Option>
          </Flex>
          <Option
            type="checkbox"
            title="WASM parser: write inline marks as toggle tags, e.g. (+bold)x(-bold)"
            checked={snap.toggleTags}
            onChange={(checked) => uiState.setToggleTags(checked)}
          >
            Toggle tags
          </Option>
          <Option
            type="checkbox"
            title="Show the deprecated bitmark-parser-generator's tabs"
            checked={snap.showLegacy}
            onChange={(checked) => uiState.setShowLegacy(checked)}
          >
            Legacy parser (bpg)
          </Option>
        </Box>
      )}
    </Box>
  );
};

export { SettingsMenu };
