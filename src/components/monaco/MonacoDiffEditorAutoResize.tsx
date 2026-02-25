// @awa-component: PLAN-005-MonacoDiffEditorAutoResize
import React, { createRef } from 'react';
import { MonacoDiffEditor, MonacoDiffEditorProps } from 'react-monaco-editor';

export interface MonacoDiffEditorAutoResizeProps extends MonacoDiffEditorProps {
  className?: string;
}

interface State {
  width: number;
  height: number;
}

// @awa-impl: PLAN-005-Step1 (auto-resizing diff editor wrapper)
// Mirrors MonacoEditorAutoResize pattern for consistent resize behaviour
class MonacoDiffEditorAutoResize extends React.Component<MonacoDiffEditorAutoResizeProps, State> {
  private divRef = createRef<HTMLDivElement>();
  private resizeObserver: ResizeObserver | undefined;
  private width = 0;
  private height = 0;

  constructor(props: MonacoDiffEditorAutoResizeProps) {
    super(props);

    this.state = {
      width: 0,
      height: 0,
    };

    this.divResize = this.divResize.bind(this);
    this.resizeObserver = new ResizeObserver(this.divResize);
  }

  componentDidMount(): void {
    const div = this.divRef.current;
    if (div && this.resizeObserver) {
      this.resizeObserver.observe(div);
    }
  }

  componentWillUnmount(): void {
    const div = this.divRef.current;
    if (div && this.resizeObserver) {
      this.resizeObserver.unobserve(div);
    }
  }

  divResize(_entries: ResizeObserverEntry[], _observer: ResizeObserver): void {
    const div = this.divRef.current;

    if (div) {
      this.width = div.clientWidth ?? 0;
      this.height = div.clientHeight ?? 0;

      this.setState({
        width: this.width,
        height: this.height,
      });
    }
  }

  render() {
    const { className, ...rest } = this.props;
    return (
      <div
        className={className ?? undefined}
        ref={this.divRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      >
        <MonacoDiffEditor {...rest} width={this.width} height={this.height} />
      </div>
    );
  }
}

export { MonacoDiffEditorAutoResize };
