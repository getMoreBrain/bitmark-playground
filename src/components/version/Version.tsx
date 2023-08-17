import { Text, TextProps } from 'theme-ui';

import { useApplicationInfo } from '../../services/ApplicationInfo';

export interface VersionProps extends TextProps {
  //
}

const Version = (props: VersionProps) => {
  const { ...restProps } = props;
  const applicationInfo = useApplicationInfo();

  return (
    <Text {...restProps}>
      bitmark Playground: v{applicationInfo.version}, bitmark-parser-generator: v
      {applicationInfo.bitmarkParserGeneratorVersion}
    </Text>
  );
};

export { Version };
