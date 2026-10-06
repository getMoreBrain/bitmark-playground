// @awa-component: PLAN-023-Panes

/**
 * The panes' own layout and banner styles, once per document. Colours come
 * from CSS custom properties a host can set (`--bm-banner-*`).
 */
export const PANE_CSS = `
.bm-pane{display:flex;flex-direction:column;width:100%;height:100%;min-height:0;position:relative}
.bm-pane-editor{flex:1 1 auto;min-height:0}
.bm-pane-banner{flex:0 0 auto;padding:2px 8px;font:12px/1.5 system-ui,sans-serif;background:var(--bm-banner-bg,#3a2d00);color:var(--bm-banner-fg,#ffd479)}
.bm-pane-banner[hidden]{display:none}
.bm-theme-light .bm-pane-banner,.bm-theme-light.bm-pane .bm-pane-banner{background:var(--bm-banner-bg,#fff8c5);color:var(--bm-banner-fg,#4d2d00)}
.bm-stale .bm-pane-editor{opacity:var(--bm-stale-opacity,.6)}
`;

export const injectPaneCss = (): void => {
  if (typeof document === 'undefined') return;
  if (document.querySelector('style[data-bitmark-panes]')) return;
  const style = document.createElement('style');
  style.setAttribute('data-bitmark-panes', '');
  style.textContent = PANE_CSS;
  document.head.appendChild(style);
};
