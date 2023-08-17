import { Text, TextProps } from 'theme-ui';

import { useApplicationInfo } from '../../services/ApplicationInfo';

export interface CopyrightProps extends TextProps {
  //
}

const Copyright = (props: CopyrightProps) => {
  const { ...restProps } = props;
  const applicationInfo = useApplicationInfo();

  return <Text {...restProps}>{applicationInfo.copyright}</Text>;
};

export { Copyright };
