// Visible keyboard focus on web: the browser default barely shows on filled buttons.
if (typeof document !== 'undefined' && !document.getElementById('chronicles-focus')) {
  const style = document.createElement('style');
  style.id = 'chronicles-focus';
  style.textContent = `
    :focus-visible { outline: 2px solid #1d2430 !important; outline-offset: 2px; }
    /* The hold-to-stop button: a long press must not select text or open a menu. */
    [data-testid="stop"], [data-testid="stop"] * { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
    @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
  `;
  document.head.appendChild(style);
}
export {};
