---
paths:
  - "src/app/**"
  - "src/components/**"
---
# React Native and react-native-web gotchas

UI code on both platforms: React Compiler lint rules, react-native-web differences, long presses, headers, focus, layout and the Modal wrapper. The codemap is in `docs/ARCHITECTURE.md`; the decisions and their history are in `docs/decisions/`.

- React Compiler lint rules (`eslint-config-expo`):
  - Call `setState` from callbacks, timers or subscriptions, not synchronously in an
    effect body.
  - Use lazy initializers for `Date.now()`.
  - Don't read or write `ref.current` during render; use `useState(() => new Animated.Value(0))`.
  - For callbacks passed into hooks, store them in a ref that is updated in an effect.
- react-native-web's `AccessibilityInfo.isScreenReaderEnabled()` always resolves
  `true`. Don't branch on it on web.
- A long press on web needs two guards. `user-select: none` and
  `-webkit-touch-callout: none` stop iOS Safari from selecting the label. A
  Pressable `onLongPress` (with `delayLongPress` beyond the hold) stops Android
  Chrome's `contextmenu`, which react-native-web otherwise treats as the end of the
  press. HoldButton has both.
- `headerBackVisible: false` is ignored on web; also set `headerLeft: () => null`.
  After the replay modal, return with `router.dismissTo('/')`; `replace('/')`
  stacks a second log.

- **Never import `Modal` from react-native; use `components/Modal`.**
  react-native-web's Modal creates its portal's `<div>` during render and
  removes it in an effect's cleanup. The home screen stays rendered but hidden
  (its effects disconnected) under the walk, so each of its re-renders appended
  a new portal to `<body>`, each with React's full set of event listeners:
  about three a second, until the owner's iPhone tab crashed mid-walk (Nov 1).
  The wrapper renders the Modal only while it is visible. The e2e checks that
  `<body>` and the listener count don't grow while walking. `scripts/perf-walk.js`
  walks a dense fake downtown for `PERF_MIN` minutes and prints heap, nodes,
  listeners and CPU every 30 s.

- react-native-web gives a one-line `Text` (`numberOfLines={1}`) `maxWidth:
  100%` of its parent. A label wider than its parent (a star's name) needs an
  explicit `maxWidth`, or it truncates to the parent's width.

- **A touch handler gets the browser's own TouchEvent on the web**: `e.nativeEvent.pageX` is undefined, and a
  lifted finger is only in `changedTouches`. Read the point with `touchPoint` (`components/CaptureView.tsx`); the
  viewer's swipe across a stack's pieces never worked on the web until it did (response thread, Nov 11).
- `findNodeHandle` doesn't exist on web. Use `focusOn(ref)` in `src/lib/focus.ts`.
- React Compiler lint treats a ref passed inside a props object (`props.x.ref`) as
  a ref read during render. Use `forwardRef` instead.

- On web, a View that React reuses from another layout (same type, same position)
  never reports `onLayout`. When a component swaps between two layouts (the
  capture's card while its file loads, then the full-screen media), key each
  root so it mounts fresh.
- iOS can leave the page scrolled after the keyboard, the system camera or an app
  switch, so the screen's bottom bar ends halfway up. `webStyles.web.ts` pins
  `#root` to the viewport (`position: fixed; inset: 0`) and scrolls back to 0
  whenever nothing is being typed in.

- **`flex: 0` is not "size to content" on web.** react-native-web writes it as
  CSS `flex: 0` (`0 1 0%`), and every View has `min-height: 0`, so in a
  scrolled column whose content overflows the item shrinks to nothing and the
  next item draws over it (the town page's wide tile on the owner's iPhone,
  Nov 3; Chromium does it too). To undo a shared `flex: 1`, leave that style
  out, or set `flexGrow: 0, flexShrink: 0`.

- **A focused field under 16 px zooms the page on iOS Safari**, and the pinned
  `#root` leaves no easy way back out (the media editor's caption, Nov 4). The
  caption is sized from the photo's width, so a narrow photo or video types
  below 16 px. Every `TextInput` a web user can focus must be at least 16 px
  while focused; `typingFontSize` (`lib/captionInput`) does it for the caption.

- **The web build is one bundle: route splitting is off** (`app.json`, expo-router's `asyncRoutes: { web: false }`;
  fix stale-chunk, the owner's iPhone, Nov 11). SDK 58 turned it on for web by default, giving each route its own
  `<route>-<hash>.js` loaded on first visit. Every Pages deploy replaces `dist/` whole, so a page left open across a
  deploy asked for the old hash on its next screen: a 404, "Loading module … failed" in `ScreenError`, and Try again
  asked for the same missing file. The route files were about 350 KB of about 4 MB. Don't turn it back on, or add an
  `import()` that the export splits into its own file, unless the deploy keeps the previous build's files. An open
  page then runs its old code until it is reloaded. `tabs/oneBundle.test.ts` reads the resolved config.
