/*
 * Makes the web app installable to a phone's home screen (v1 slice 6, NT1):
 * the manifest and Apple's home-screen tags, added at startup with the base
 * path (GitHub Pages serves the app under /chronicles), which a static
 * template can't follow on deeper routes. iOS shows web notifications only
 * for an app added to the Home Screen.
 */
const base = process.env.EXPO_BASE_URL ?? '';

function add(tag: 'link' | 'meta', attrs: Record<string, string>) {
  const key = tag === 'link' ? `link[rel="${attrs.rel}"]` : `meta[name="${attrs.name}"]`;
  if (document.head.querySelector(key)) return;
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.head.appendChild(el);
}

if (typeof document !== 'undefined') {
  add('link', { rel: 'manifest', href: `${base}/manifest.webmanifest` });
  add('link', { rel: 'apple-touch-icon', href: `${base}/icon-180.png` });
  add('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
  add('meta', { name: 'mobile-web-app-capable', content: 'yes' });
  add('meta', { name: 'apple-mobile-web-app-title', content: 'Chronicles' });
  add('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'default' });
  add('meta', { name: 'theme-color', content: '#f4f2ee' });
}

export {};
