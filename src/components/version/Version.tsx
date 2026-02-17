// @zen-component: PLAN-002-Version
import { Text, TextProps } from 'theme-ui';

import { useApplicationInfo } from '../../services/ApplicationInfo';

export interface VersionProps extends TextProps {
  //
}

// @zen-impl: PLAN-002-Step8 (version display with both parsers)
const Version = (props: VersionProps) => {
  const { ...restProps } = props;
  const applicationInfo = useApplicationInfo();

  const bpgVersionText = applicationInfo.bitmarkParserGeneratorVersion
    ? `v${applicationInfo.bitmarkParserGeneratorVersion}`
    : applicationInfo.bitmarkParserGeneratorLoadError
      ? 'error'
      : 'loading...';
  const bpgColor = applicationInfo.bitmarkParserGeneratorVersion
    ? 'green'
    : applicationInfo.bitmarkParserGeneratorLoadError
      ? 'red'
      : undefined;

  const bpVersionText = applicationInfo.bitmarkParserVersion
    ? `v${applicationInfo.bitmarkParserVersion}`
    : applicationInfo.bitmarkParserLoadError
      ? 'error'
      : 'loading...';
  const bpColor = applicationInfo.bitmarkParserVersion
    ? 'green'
    : applicationInfo.bitmarkParserLoadError
      ? 'red'
      : undefined;

  return (
    <Text {...restProps}>
      bitmark Playground:{' '}
      <Text as="span" sx={{ color: 'green' }}>
        v{applicationInfo.version}
      </Text>
      , bpg:{' '}
      <Text as="span" sx={{ color: bpgColor }}>
        {bpgVersionText}
      </Text>
      , bp:{' '}
      <Text as="span" sx={{ color: bpColor }}>
        {bpVersionText}
      </Text>
    </Text>
  );
};

export { Version };
