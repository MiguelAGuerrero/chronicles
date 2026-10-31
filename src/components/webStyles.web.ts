// Web-only page fixes, loaded once from the root layout.
if (typeof document !== 'undefined' && !document.getElementById('chronicles-focus')) {
  const style = document.createElement('style');
  style.id = 'chronicles-focus';
  style.textContent = `
    :focus-visible { outline: 2px solid #1d2430 !important; outline-offset: 2px; }
    /* The hold-to-stop button: a long press must not select text or open a menu. */
    [data-testid="stop"], [data-testid="stop"] * { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
    @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
    /* The app is pinned to the viewport, so the page itself never scrolls or
       rubber-bands: on iOS the keyboard or the system camera could otherwise
       leave it shifted, with the screen's bottom bar halfway up. */
    html, body { overscroll-behavior: none; }
    #root { position: fixed; inset: 0; height: auto; }
  `;
  document.head.appendChild(style);

  // iOS scrolls the page to keep a focused field above the keyboard, and does
  // not always scroll back once it closes, or after the camera or another app
  // returns. Put it back, but never while someone is typing.
  const typing = () => {
    const el = document.activeElement as HTMLElement | null;
    return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
  };
  const settle = () => {
    if (!typing() && (window.scrollX || window.scrollY)) window.scrollTo(0, 0);
  };
  const soon = () => setTimeout(settle, 250);
  for (const type of ['focusout', 'focus', 'pageshow', 'orientationchange', 'resize', 'scroll']) window.addEventListener(type, soon, { passive: true });
  document.addEventListener('visibilitychange', soon);
  window.visualViewport?.addEventListener('resize', soon);
}
export {};
