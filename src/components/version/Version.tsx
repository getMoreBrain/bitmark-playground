import { Text, TextProps } from 'theme-ui';

import { useApplicationInfo } from '../../services/ApplicationInfo';

export interface VersionProps extends TextProps {
  //
}

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
      bitmark-playground:{' '}
      <Text as="span" sx={{ color: 'green' }}>
        v{applicationInfo.version}
      </Text>
      , bitmark-editor:{' '}
      <Text as="span" sx={{ color: 'green' }}>
        v{applicationInfo.bitmarkEditorVersion}
      </Text>
      , bitmark-parser:{' '}
      <Text as="span" sx={{ color: bpColor }}>
        {bpVersionText}
      </Text>
      , legacy-parser:{' '}
      <Text as="span" sx={{ color: bpgColor }}>
        {bpgVersionText}
      </Text>
    </Text>
  );
};

export { Version };
