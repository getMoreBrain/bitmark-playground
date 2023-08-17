import React, { ComponentType, ReactNode } from 'react';

export type WithShouldUpdateFunction<Props, State> = (
  props: Props,
  nextProps: Props,
  state: State,
  nextState: State,
) => boolean;

export type ShouldUpdateFunction = () => boolean;

export interface ShouldUpdateProps {
  shouldUpdate: ShouldUpdateFunction;
  children: ReactNode;
}

/**
 * Wrap a component with withShouldUpdate to provide a custom shouldComponentUpdate function.
 *
 * @param WrappedComponent
 * @param shouldUpdate
 * @returns
 */
function withShouldUpdate<Props = {}, State = {}>(
  WrappedComponent: ComponentType<Props>,
  shouldUpdate: WithShouldUpdateFunction<Props, State>,
): ComponentType<Props> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return class ShouldUpdate extends React.Component<Props, State> {
    shouldComponentUpdate(nextProps: Props, nextState: State): boolean {
      if (shouldUpdate) {
        return shouldUpdate(this.props, nextProps, this.state, nextState);
      }
      return true;
    }

    render(): ReactNode {
      return <WrappedComponent {...this.props} />;
    }
  };
}

/**
 * A component that will only update when shouldUpdate is true.
 */
class ShouldUpdate extends React.Component<ShouldUpdateProps> {
  shouldComponentUpdate(): boolean {
    const { shouldUpdate } = this.props;

    if (shouldUpdate) {
      return shouldUpdate();
    }

    return true;
  }

  render(): ReactNode {
    return this.props.children;
  }
}

export { withShouldUpdate, ShouldUpdate };
