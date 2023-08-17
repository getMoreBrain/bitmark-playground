import { Text, TextProps } from 'theme-ui';
import { useSnapshot } from 'valtio';

import { bitmarkState } from '../../state/bitmarkState';

export interface BitmarkMarkupDurationProps extends TextProps {
  //
}

const BitmarkMarkupDuration = (props: BitmarkMarkupDurationProps) => {
  const { ...restProps } = props;
  const bitmarkStateSnap = useSnapshot(bitmarkState);

  const value = bitmarkStateSnap.markupDurationSec ? `${bitmarkStateSnap.markupDurationSec}s` : '';

  return <Text {...restProps}>{value}</Text>;
};

export { BitmarkMarkupDuration };
