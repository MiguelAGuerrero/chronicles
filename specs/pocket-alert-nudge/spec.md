<!-- Repo first: not yet a tab of the owner's Claude Docs doc "Explorer App Concept" (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). Copy it in as a tab when the owner wants it there; from then on the doc wins. Written: 2026-11-03. -->

# Pocket alert: a nudge you can tell apart

Nov 3, 2026 · @Miguel Guerrero

The owner asked for "an indication, maybe like a rumble, as a nudge to say something's nearby" while walking with the app open, opt-in and a setting. The pocket alert (v1 discovery, E19) already does this: off by default, one tap per "?" place as it comes into range on an exploring walk. It plays the same light tap as a button press, though, so in a pocket it is easy to miss or to take for a stray touch. This slice keeps the alert's rules and changes how it feels.

## Decisions (the owner, Nov 3)

- Change the existing pocket alert; no second setting.
- It fires for unfound "?" marks within your range only, as today. Not for marks along the route, places already found (memories never buzz, 0037) or busy streets.
- Exploring walks only, as today (a quiet walk is navigation plus captures, 0031).
- It feels like a distinct double-tap.
- The web gets it too, wherever the browser can buzz (decision 0079): expo-haptics 58 vibrates on the web (`navigator.vibrate`, Android Chrome) and tries iPhone Safari's switch haptic on a touch screen.

## Criteria

1. **PA1** The pocket alert is a double-tap: two taps, a short fixed gap apart (a motion token, never a hard-coded duration), each firmer than a button's light tap. A button press is still one light tap.
2. **PA2** Several places coming into range together give one double-tap, not one per place. Each place still alerts once a walk (E19).
3. **PA3** The rules are unchanged: off by default; nothing on a quiet walk, on a ride or with the switch off.
4. **PA4** The double-tap goes through the one feedback call (`feedback`, M8) like every other haptic; nothing else calls the haptics.
5. **PA5** The switch's note says what you'll feel: "Two soft taps when a “?” comes into range. Never on a quiet walk." The Start dialog and the Explore settings say the same.
6. **PA6** On the web, the switch shows where the browser can buzz (a touch screen: Android Chrome vibrates, iPhone Safari gets the switch haptic) and nowhere else, and the alert plays the same double-tap through expo-haptics. Only the alert: a button press still gives nothing on the web.

## Audit (2026-11-03)

7 findings, 7 fixed (one in part), 0 rejected; two parts deferred.

1. At the 60 m range the alert never fired: inside 60 m a place is named, never a bare "?", and only "?" alerted (older than this slice): accept. Every unfound mark in range counts (`alertKeys`). `pocket-alert-nudge audit 1`.
2. Previewing a wider range in settings nudged and used up those places' alerts: accept. No alert while previewing. `pocket-alert-nudge audit 2`.
3. Minimizing the walk (or a reload) forgot what had alerted, so places nudged again: accept for minimize, the alerted places are kept per walk (`alertedFor`); defer the reload. `pocket-alert-nudge audit 3`.
4. Desktop Chrome has `navigator.vibrate` and no motor, so it offered a switch that could never be felt; an iPad matched too: accept. Offered on a touch screen only (`buzzOffered`); an iPad stays a guess. `pocket-alert-nudge audit 4`, and the e2e's switch checks.
5. A place first seen inside 60 m (a coarse fix, a late read) never alerted: accept, fixed with 1. `pocket-alert-nudge audit 5`.
6. Two nudges within the gap ran together as four taps; the second tap plays even if the walk stopped in between: accept the first, a nudge within three gaps of the last is dropped (`nudgeAllowed`); defer the second (120 ms, after a hold-to-stop). `pocket-alert-nudge audit 6`.
7. Nothing stopped a component from calling `lib/haptics` directly, so PA4 was not enforced: accept. A lint pattern restricts `**/haptics` everywhere but `lib/motion`. Covered by lint (checked with a probe file importing it).

UI notes: "Two soft taps" stays, as the plain word for a gentle tap, though each is a medium impact. A find still gives nothing on the web (only the alert buzzes there, 0079).

## Record

PA1-PA6 pass: `motion.test.ts` (PA1, PA4, audits 4 and 6), `explore.test.ts` (PA2, PA3, PA5, audits 1, 2, 3 and 5), the e2e `nudge` scenario (PA2, PA3, PA5, PA6) and the main flow's switch checks. Deferred: the reload case of audit 3, the late second tap of audit 6, button haptics on the web, the alert with the screen off.
