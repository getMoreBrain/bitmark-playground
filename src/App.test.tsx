import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { App } from './App';

// The session's panes need a real Monaco; the package's tests and the
// browser checks cover them (PLAN-021 Step 14).
vi.mock('./session/PlaygroundSession', () => ({
  RIGHT_SESSION_TABS: [],
  PlaygroundSession: ({ children }: { children: React.ReactNode }) => children,
  keepsMounted: () => true,
  SessionPaneTab: () => null,
}));

describe('App', () => {
  it('renders without crashing', () => {
    const { container } = render(<App />);
    expect(container).toBeInTheDocument();
  });
});
