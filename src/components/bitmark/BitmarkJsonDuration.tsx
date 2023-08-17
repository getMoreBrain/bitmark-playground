import { Text, TextProps } from 'theme-ui';
import { useSnapshot } from 'valtio';

import { bitmarkState } from '../../state/bitmarkState';

export interface BitmarkJsonDurationProps extends TextProps {
  //
}

const BitmarkJsonDuration = (props: BitmarkJsonDurationProps) => {
  const { ...restProps } = props;
  const bitmarkStateSnap = useSnapshot(bitmarkState);

  const value = bitmarkStateSnap.jsonDurationSec ? `${bitmarkStateSnap.jsonDurationSec}s` : '';

  return <Text {...restProps}>{value}</Text>;
};

export { BitmarkJsonDuration };
