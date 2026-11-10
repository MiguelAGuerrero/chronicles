<!-- Compiled Nov 9-10, 2026 by a research agent for decision 0108 (the owner asked for UI rules grounded in sources). Apple HIG and WCAG 2.2 were read from primary sources; Material Design 3 (m3.material.io) and Nielsen Norman Group (nngroup.com) were blocked from the session's network and are not used (Material Components and developer.android.com stand in). Re-run with those hosts allowed to fill the gaps. -->

# UI patterns reference, from primary sources

Research for `.claude/rules/ui-patterns.md` (Chronicles). Compiled 2026-11-10.

## Read this first: what could and could not be fetched

- **Apple HIG: fetched.** The HIG site renders with JavaScript, so each page was read from Apple's own data endpoint for that page (`https://developer.apple.com/tutorials/data/design/human-interface-guidelines/<slug>.json`). That is the same content as the human-readable URL cited below. These pages are the current HIG, which includes the iOS 26 "Liquid Glass" guidance.
- **Material Design 3 (m3.material.io): NOT fetched.** The host is blocked from this cloud session (DNS refused or proxy 403). None of its content is quoted here. As a substitute, the Material column cites two other Google sources that were fetched:
  - Google's Material Components for Android docs on GitHub (`material-components/material-components-android/docs/components/*.md`). These are Google's official Material implementation docs and link to the M3 spec.
  - developer.android.com (Compose component pages, accessibility pages, system-bars guidance).

  These are thinner than m3.material.io on usage rules. Where a Material position is not stated in those pages, this file says "no fetched Material source" and does not fill the gap.
- **Nielsen Norman Group (nngroup.com): NOT fetched.** The host is blocked. The 10 heuristics and NN/g articles are not quoted or paraphrased anywhere in this file. Re-run this research with `www.nngroup.com` allowed before citing them.
- **WCAG 2.2 (w3.org): the host is blocked, but the normative text was fetched** from the W3C's own source repository (`github.com/w3c/wcag`, `main` branch: `guidelines/sc/**` and `understanding/22/target-size-minimum.html`). Each criterion below cites its canonical w3.org URL. The quoted text is what that repository holds. It matches the published 2.2 Recommendation wording as I know it, but I could not compare it against w3.org directly.

Conventions: "HIG:" and "Material:" mark what each source says. **(inference)** marks my own reasoning, not the source's words. Apple uses points (pt), Android uses dp, and WCAG uses CSS px. In React Native, layout units map to pt on iOS, dp on Android and CSS px on web **(inference)**.

---

## 1. Patterns reference

### 1.1 Bars and toolbars

**T1. A toolbar holds actions on the current view. A tab bar only navigates between top-level sections.**
- Why: if a tab bar also triggers actions, people can no longer tell where tapping takes them versus what it does.
- HIG: "Use a tab bar to support navigation, not to provide actions… If you need to provide controls that act on elements in the current view, use a toolbar instead." Also: "In contrast to a toolbar, a tab bar is specifically for navigating between areas of an app."
  - https://developer.apple.com/design/human-interface-guidelines/tab-bars
  - https://developer.apple.com/design/human-interface-guidelines/toolbars
- Material: a navigation bar "lets people switch between UI views on smaller devices", with "three to five destinations". Use it for "Three to five destinations of equal importance". The docked and floating toolbars "show actions related to the current page".
  - https://github.com/material-components/material-components-android/blob/master/docs/components/BottomNavigation.md
  - https://developer.android.com/develop/ui/compose/components/navigation-bar
  - https://github.com/material-components/material-components-android/blob/master/docs/components/DockedToolbar.md
- Agree.

**T2. Keep the tab bar visible and stable. Never hide or disable tabs.**
- Why: if the tab bar disappears, people forget which area of the app they are in.
- HIG: "If you hide the tab bar, people can forget which area of the app they're in. The exception is when a modal view covers the tab bar." And: "Don't disable or hide tab bar buttons, even when their content is unavailable… If a section is empty, explain why." Tabs carry labels: "Include tab labels… Use single words whenever possible."
  - https://developer.apple.com/design/human-interface-guidelines/tab-bars
- Material: each destination is "represented by an icon and label text". Set a title on every item for screen readers.
  - https://github.com/material-components/material-components-android/blob/master/docs/components/BottomNavigation.md
- Agree on labels. Hiding is not addressed in the fetched Material sources.

**T3. Keep the number of toolbar items small. Overflow goes into a More menu, and only when needed.**
- Why: people need to tell items apart and hit each one.
- HIG (iOS): "Prioritize only the most important items for inclusion in the main toolbar area… Create a More menu to include additional items." Also: "Try to include all actions in the toolbar if possible, and only add this menu if you really need it." Groups: "aim for a maximum of three."
  - https://developer.apple.com/design/human-interface-guidelines/toolbars
- Material: the bottom app bar provides "up to four actions, including the FAB". It is marked deprecated in favour of the docked toolbar. The fetched toolbar docs give an overflow container (`OverflowLinearLayout`) but no item count.
  - https://github.com/material-components/material-components-android/blob/master/docs/components/BottomAppBar.md
  - https://github.com/material-components/material-components-android/blob/master/docs/components/DockedToolbar.md
- Broadly agree. Neither fetched source gives a hard iOS item count.

**T4. Use the standard Back and Close controls, as symbols, not as text.**
- Why: people already know what these controls do and expect them in the usual place.
- HIG: "Use the standard Back and Close buttons… Prefer the standard symbols for each, and don't use a text label that says Back or Close."
  - https://developer.apple.com/design/human-interface-guidelines/toolbars
- Material: a contextual action bar uses a "Close button (instead of a navigation icon)".
  - https://github.com/material-components/material-components-android/blob/master/docs/components/TopAppBar.md
- Agree.

**T5. Toolbar items should be recognizable symbols. Use text only where no symbol reads clearly. Don't put text and symbol items next to each other.**
- Why: an unclear icon makes people guess. A text item next to a symbol item looks like one combined control.
- HIG: "Prefer simple, recognizable symbols for items instead of text, except for actions like edit that aren't well-represented by symbols." Also: "Keep actions with text labels separate. Placing an action with a text label next to an action with a symbol can create the illusion of a single action." And: "Prefer system-provided symbols without borders."
  - https://developer.apple.com/design/human-interface-guidelines/toolbars
- Material: "You should set a `contentDescription` on all the actions in the floating toolbar" (the docked toolbar doc says the same). Toolbar actions are icon buttons with spoken names.
  - https://github.com/material-components/material-components-android/blob/master/docs/components/FloatingToolbar.md
- Agree: icon-first, with a spoken name on every action.
- **This contradicts today's rule "Labels on toolbar actions (icon and word)".** Labelled toolbar items are an app choice, not platform guidance (inference). If you keep labels, label every item in the bar so text and icon-only items are never mixed.

**T6. A toolbar has at most one primary (prominent) action, on the trailing side.**
- Why: several emphasized actions compete for attention and add to the time it takes to choose.
- HIG: "Use the .prominent style for key actions such as Done or Submit… Only specify one primary action, and put it on the trailing side of the toolbar."
  - https://developer.apple.com/design/human-interface-guidelines/toolbars
- Material: the FAB "represents the primary action of a screen". It "promotes a single, focused action… typically found anchored to the bottom right of the screen."
  - https://github.com/material-components/material-components-android/blob/master/docs/components/FloatingActionButton.md
  - https://developer.android.com/develop/ui/compose/components/fab
- Agree on one primary action. They differ on its form:
  - iOS: a prominent bar item.
  - Android: a FAB, or the docked toolbar variant "with embedded primary action instead of FAB".

**T7. Bars are a separate layer that floats over content. Content runs underneath, separated by the system's edge treatment, not by a custom background.**
- Why: content stays full-bleed, while controls stay visually distinct from it.
- HIG: "Differentiate controls from content… Instead of applying a solid or semi-opaque background color beneath controls, use a scroll edge effect… For full-screen background content, be sure to extend it underneath sidebars, toolbars, and tab bars." Also "Reduce the use of toolbar backgrounds and tinted controls." And: "Only use a scroll edge effect when a scroll view is behind floating interface elements."
  - https://developer.apple.com/design/human-interface-guidelines/layout
  - https://developer.apple.com/design/human-interface-guidelines/toolbars
  - https://developer.apple.com/design/human-interface-guidelines/scroll-views
- Android: "draw content behind these bars to go edge-to-edge". Use insets "to properly handle system bar intrusions and ensure your content is not obscured". Also "Avoid adding interactions or touch targets under gesture navigation insets."
  - https://developer.android.com/design/ui/mobile/guides/foundations/system-bars
- Agree.
- **This qualifies today's rule "The media area is laid out between the bars, not under them."** Current iOS guidance extends full-screen content under the bars. What both platforms rule out is controls outside a bar, not content under a bar (inference). Whether React Native can draw the system glass treatment is outside this research.

### 1.2 Menus and context menus

**M1. A menu holds commands revealed on request. List the important items first, group them, and keep it short.**
- Why: people scan from the top, and long menus hide the command they want.
- HIG: "Prefer listing important or frequently used menu items first." Also "Be mindful of menu length." Use separators to group. Labels are verbs: "label a menu item that initiates an action using a verb or verb phrase." And: "provide icons for all menu items in a group, or none of them."
  - https://developer.apple.com/design/human-interface-guidelines/menus
- Material: menus "display a list of choices on temporary surfaces… They appear when users interact with a button, action, or other control."
  - https://github.com/material-components/material-components-android/blob/master/docs/components/Menu.md
- Agree.

**M2. Use a More menu for actions that don't need a prominent spot. Never use it for the view's primary actions.**
- Why: a hidden primary action is undiscoverable, and the ellipsis icon doesn't tell people what is inside.
- HIG: "Avoid putting all of a view's actions in one pull-down button. A view's primary actions need to be easily discoverable." Also: "Consider using a More pull-down button to present items that don't need prominent positions… it can also hinder discoverability."
  - https://developer.apple.com/design/human-interface-guidelines/pull-down-buttons
- Material: no fetched source.
- iOS position stated. Same practice on Android (inference).

**M3. A button that reveals related choices (for example an Add button that asks what kind of thing to add) is a pull-down menu. A menu with fewer than three items should be plain buttons instead.**
- Why: one control replaces a row of buttons. Opening a menu for one or two items isn't worth the extra tap.
- HIG: "An Add button could present a menu that lets people specify the item they want to add." Also: "listing a minimum of three items can help the interaction feel worthwhile. If you need to list only one or two items, consider using alternative components."
  - https://developer.apple.com/design/human-interface-guidelines/pull-down-buttons
- Material: dropdown menus "let users click an icon… and then select from a list of options on a temporary surface".
  - https://developer.android.com/develop/ui/compose/components/menu
- Agree.
- **This qualifies today's rule "A choice of several kinds is an action sheet."** The HIG puts a "what kind to add" choice in a menu from the Add button. It keeps action sheets for choices that follow an action the person has already started (see A1).

**M4. Context menus (touch and hold) are shortcuts only. Every item must also exist in the main interface. Put destructive items last, styled destructive.**
- Why: context menus are hidden by default, so people may never find them.
- HIG: "Always make context menu items available in the main interface, too… the context menu items that are available for a message in the Inbox are also available in the toolbar of the message view." Also "Aim for a small number of menu items." And: "list them at the end of the menu and identify them as destructive." Also: "Hide unavailable menu items, don't dim them." And "Provide either a context menu or an edit menu for an item, but not both."
  - https://developer.apple.com/design/human-interface-guidelines/context-menus
- Material: no fetched source on context menus. Android requires that gesture-only actions also be exposed as accessibility actions (see X7).
- iOS position stated. Mirror it on Android (inference).

### 1.3 Action sheets, alerts and confirmation

**A1. An action sheet offers choices that follow an action the person started. Use it sparingly, keep it short, and don't let it scroll.**
- Why: an action sheet interrupts the task. If it scrolls, people mis-tap.
- HIG: "An action sheet is a modal view that presents choices related to an action people initiate." Also "Use action sheets sparingly." In iOS: "Use an action sheet — not a menu — to provide choices related to an action… people expect a menu to appear when they choose to reveal it." And "Avoid letting an action sheet scroll."
  - https://developer.apple.com/design/human-interface-guidelines/action-sheets
- Material: there is no action-sheet component in the fetched sources. A modal bottom sheet sits "above a scrim". A basic dialog is for "alerts, quick selection, and confirmation".
  - https://github.com/material-components/material-components-android/blob/master/docs/components/BottomSheet.md
  - https://github.com/material-components/material-components-android/blob/master/docs/components/Dialog.md
- The platforms differ:
  - iOS: an action sheet.
  - Android: a modal bottom sheet listing the choices, or a dialog for a short confirmation (inference from the component descriptions).

**A2. Action sheet layout: a Cancel button at the bottom, and destructive choices in red at the top.**
- HIG: "Place the Cancel button at the bottom of the action sheet." Also: "Make destructive choices visually prominent. Use the destructive style… and place these buttons at the top of the action sheet."
  - https://developer.apple.com/design/human-interface-guidelines/action-sheets
- Material: no fetched equivalent.
- iOS only.

**A3. Don't confirm common deletes that can be undone. Do confirm uncommon, irreversible ones.**
- Why: a confirmation on every routine delete teaches people to tap through it. Then it fails to catch the one delete that matters.
- HIG: "Avoid displaying alerts for common, undoable actions, even when they're destructive… when people take an uncommon destructive action that they can't undo, it's important to display an alert." Also: "don't warn people when data loss is the expected result of their action."
  - https://developer.apple.com/design/human-interface-guidelines/alerts
  - https://developer.apple.com/design/human-interface-guidelines/feedback
- Material/Android: a dialog for "Confirming user action, such as when deleting a file". A snackbar for "After a user deletes an email or message… offer an Undo option."
  - https://developer.android.com/develop/ui/compose/components/dialog
  - https://developer.android.com/develop/ui/compose/components/snackbar
- Agree in principle: offer undo where you can, and confirm where you can't.
- WCAG 3.3.4 (AA) requires deletion of user data to be reversible, checked, or confirmed. Its scope is "web pages that… modify or delete user-controllable data in data storage systems".
  - https://www.w3.org/TR/WCAG22/#error-prevention-legal-financial-data

**A4. A destructive item chosen from a menu gets a confirmation step in a different place from the menu.**
- HIG: "When people choose a destructive action, the system displays an action sheet (iOS) or popover (iPadOS) in which they can confirm their choice or cancel… Because an action sheet appears in a different location from the menu and requires deliberate dismissal, it can help people avoid losing data by mistake."
  - https://developer.apple.com/design/human-interface-guidelines/pull-down-buttons
- Android: confirm in a dialog (inference from A3's Android source).

**A5. Alert copy: a specific title, buttons that are verbs, and Cancel always titled "Cancel". Never make a destructive button the default.**
- Why: "OK" is ambiguous. People press a prominent default button without reading it.
- HIG: "Avoid using OK as the default button title unless the alert is purely informational." Also: "Always use 'Cancel' to title a button that cancels the alert's action." Also "Avoid using an alert merely to provide information." And "Avoid showing an alert when your app starts." A destructive style marks only a destructive action "people didn't deliberately choose". From the buttons page: "Don't assign the primary role to a button that performs a destructive action, even if that action is the most likely choice."
  - https://developer.apple.com/design/human-interface-guidelines/alerts
  - https://developer.apple.com/design/human-interface-guidelines/buttons
- Material: "Dialogs are purposefully interruptive, so they should be used sparingly."
  - https://github.com/material-components/material-components-android/blob/master/docs/components/Dialog.md
- Agree on sparing use. Button wording is from the HIG only.

### 1.4 Modality: sheets, full-screen modals, popovers

**S1. Use a modal only for a short, scoped task with a clear benefit. Don't build "an app within your app".**
- HIG: "Present content modally only when there's a clear benefit." Also "Aim to keep modal tasks simple, short, and streamlined." And: "avoid creating a modal experience that feels like an app within your app."
  - https://developer.apple.com/design/human-interface-guidelines/modality
- Material: no fetched equivalent beyond dialog sparing use (A5).

**S2. Show one modal at a time. Close the first sheet before opening another.**
- Why: stacked modals hide where the person came from.
- HIG: "Let people dismiss a modal view before presenting another one." Also "Display only one sheet at a time from the main interface." And "Show one popover at a time."
  - https://developer.apple.com/design/human-interface-guidelines/modality
  - https://developer.apple.com/design/human-interface-guidelines/sheets
  - https://developer.apple.com/design/human-interface-guidelines/popovers
- Material: "full-screen dialogs are the only dialogs over which other dialogs can appear."
  - https://github.com/material-components/material-components-android/blob/master/docs/components/Dialog.md
- Agree.
- This matches the project's existing trap "iOS can't present a Modal over a Modal".

**S3. Sheet buttons: Cancel on the leading edge of the top bar, Done on the trailing edge. Done always has Cancel or Back with it. Never show Cancel, Done and Back together.**
- HIG: "for sheets with a single view, the Cancel button belongs on the leading edge of the top toolbar. When present, the Done button belongs on the trailing edge." Also "If you provide a Done button, always pair it with a Cancel button… Avoid showing all three buttons — Cancel, Done, and Back — together."
  - https://developer.apple.com/design/human-interface-guidelines/sheets
- Material: no fetched equivalent.
- iOS only.

**S4. Swipe-to-dismiss and resizable sheets: support swipe down, and show a grabber on a resizable sheet. If dismissing would lose work, ask first.**
- HIG: "Support swiping to dismiss a sheet… If people have unsaved changes in the sheet when they begin swiping to dismiss it, use an action sheet to let them confirm." Also "Include a grabber in a resizable sheet… a grabber also works with VoiceOver." And "consider supporting the medium detent to allow progressive disclosure."
  - https://developer.apple.com/design/human-interface-guidelines/sheets
- Modality page: "if closing the view could result in the loss of user-generated content, be sure to explain the situation and give people ways to resolve it… you might present an action sheet that includes a save option."
  - https://developer.apple.com/design/human-interface-guidelines/modality
- Material: bottom sheets have an optional "Drag handle". A standard (non-modal) sheet keeps "secondary content visible on screen when content in the main UI region is frequently scrolled or panned".
  - https://github.com/material-components/material-components-android/blob/master/docs/components/BottomSheet.md
- Agree on handles. The confirm-on-loss rule is from the HIG only.

**S5. On a phone, use a sheet instead of a popover. Never use a popover to show a warning.**
- HIG: "Avoid displaying popovers in compact views… for compact views, use all available screen space by presenting information in a full-screen modal view like a sheet instead." Also "Avoid using a popover to show a warning."
  - https://developer.apple.com/design/human-interface-guidelines/popovers
- Material: no fetched equivalent.

**S6. Don't use sheets to navigate the app's content.**
- HIG: "Avoid using a sheet to help people navigate your app's content."
  - https://developer.apple.com/design/human-interface-guidelines/sheets
- Material: no fetched equivalent.

### 1.5 Buttons and labels

**B1. Every control needs a clear meaning. Use a familiar icon for a familiar action, and text when a short label is clearer.**
- HIG: "Ensure that each button clearly communicates its purpose." Also "Try to associate familiar actions with familiar icons." And "Consider using text when a short label communicates more clearly than an icon… consider starting the label with a verb."
  - https://developer.apple.com/design/human-interface-guidelines/buttons
- Material: icon buttons "help people take minor actions with one tap". The FAB carries "an icon in its center". The extended FAB adds text.
  - https://github.com/material-components/material-components-android/blob/master/docs/components/IconButton.md
  - https://developer.android.com/develop/ui/compose/components/fab
- Agree.

**B2. Have one or two prominent buttons per view. Show the preferred choice with style, not size.**
- HIG: "Keep the number of prominent buttons to one or two per view." Also: "Use style — not size — to visually distinguish the preferred choice among multiple options."
  - https://developer.apple.com/design/human-interface-guidelines/buttons
- Material: one FAB per screen (T6).
- Agree.

**B3. Use roles: primary, cancel, destructive. Destructive is red and is never the primary button.**
- HIG: "A button's role can have additional effects… a destructive button uses the system red color." Also "Don't assign the primary role to a button that performs a destructive action."
  - https://developer.apple.com/design/human-interface-guidelines/buttons
- Material: no fetched equivalent.

**B4. Custom buttons need a pressed state. A slow action shows progress inside the button.**
- HIG: "Always include a press state for a custom button." In iOS: "Configure a button to display an activity indicator when you need to provide feedback about an action that doesn't instantly complete."
  - https://developer.apple.com/design/human-interface-guidelines/buttons

**B5. Make a photo tappable by wrapping it in a button. Don't add button behaviour to an image view.**
- HIG: "Image views are typically not interactive… In rare cases where you might want an image to be interactive, configure a system-provided button to display the image instead of adding button behaviors to an image view."
  - https://developer.apple.com/design/human-interface-guidelines/image-views
- In React Native: a `Pressable` with `accessibilityRole="button"` and a label around the image, not a bare touch handler (inference).

### 1.6 Media viewing (full-screen photo and video)

**V1. A full-screen photo or video may hide its bars to put content first. One familiar gesture brings them back. Essential controls must stay visible or one tap away.**
- Why: chrome competes with the photo. Hidden controls that can't be found strand the person.
- HIG: "Prioritize content by temporarily hiding toolbars and navigation controls… such as when viewing full-screen photos… let people restore the hidden elements with a familiar gesture or action like tapping, swiping down… Be sure to keep controls visible when they're essential for navigation or performing tasks." Also: "a full-screen media experience needs to make playback controls persistently available or easy to reveal." And "Let people choose when to exit full-screen mode."
  - https://developer.apple.com/design/human-interface-guidelines/going-full-screen
- Toolbars page: "Consider temporarily hiding toolbars for a distraction-free experience… offer ways to reliably restore hidden interface elements."
  - https://developer.apple.com/design/human-interface-guidelines/toolbars
- Material: no fetched source on photo-viewer chrome. The Carousel "Full-screen" layout "shows one edge-to-edge large item". Android system bars: "Images behind system bars", edge-to-edge.
  - https://github.com/material-components/material-components-android/blob/master/docs/components/Carousel.md
  - https://developer.android.com/design/ui/mobile/guides/foundations/system-bars
- iOS stated. On Android, use the same tap-to-toggle approach with edge-to-edge content (inference).

**V2. In a viewer, controls live in the viewer's bars, never as loose buttons on the image.**
- Why: a button floating over the photo covers it and has no consistent position. People can't predict where it is or tell it apart from the content.
- This is assembled from sources, not quoted (inference). It follows from:
  - T1/T3: actions go in toolbars or a More menu.
  - T7: "Differentiate controls from content".
  - V1: hide and restore the bars.
  - X5: text and controls over images need contrast.
- This is the direct answer to the shipped bug.

**V3. Display video at its original aspect ratio. Use the system player, or copy its behaviour.**
- HIG: "Use the system video player to give people a familiar and convenient experience… If your app truly requires a custom video player, reference the behavior and interface of the system video player." Also "Always display video content at its original aspect ratio." Additional information should be restricted "so that it doesn't obscure media playback".
  - https://developer.apple.com/design/human-interface-guidelines/playing-video

**V4. Text over a photo needs contrast help, such as a shadow or a background layer.**
- HIG: "Take care when overlaying text on images… ensure the text contrasts well with the image, and consider ways to make the text object stand out, like adding a text shadow or background layer."
  - https://developer.apple.com/design/human-interface-guidelines/image-views
- WCAG 1.4.3 and 1.4.11 apply (X1, X2).
- Agree: this supports today's "Text over a picture needs its own solid ground".

**V5. Double tap zooms. Don't reuse tap or swipe for app-specific actions.**
- HIG: the standard gesture table lists Double tap: "Zoom in; zoom out if already zoomed in". Also "Avoid using a familiar gesture like tap or swipe to perform an action that's unique to your app."
  - https://developer.apple.com/design/human-interface-guidelines/gestures

### 1.7 Lists and feeds

**L1. Use lists for text and collections (rows or grids) for images. Use standard layouts.**
- HIG: "Prefer displaying text in a list or table… If you have items that vary widely in size — or you need to display a large number of images — consider using a collection instead." Also "Use the standard row or grid layout whenever possible."
  - https://developer.apple.com/design/human-interface-guidelines/lists-and-tables
  - https://developer.apple.com/design/human-interface-guidelines/collections
- Material: lists "are continuous, vertical indexes of text or images".
  - https://github.com/material-components/material-components-android/blob/master/docs/components/List.md
- Agree.

**L2. Keep row text short. A row that leads deeper shows a disclosure indicator. An info button only reveals details.**
- HIG: "Keep item text succinct." Also "If you need to let people drill into a list or table row's subviews, use a disclosure indicator accessory control."
  - https://developer.apple.com/design/human-interface-guidelines/lists-and-tables

**L3. Don't change a feed's layout while someone is using it. Animate inserts and deletes. Don't nest same-direction scroll views.**
- HIG: "try to avoid changing the layout while people are viewing and interacting with it, unless it's in response to an explicit action." Also "Consider using animations to provide feedback when people insert, delete, or reorder items." And "Avoid putting a scroll view inside another scroll view with the same orientation."
  - https://developer.apple.com/design/human-interface-guidelines/collections
  - https://developer.apple.com/design/human-interface-guidelines/scroll-views

**L4. Show something immediately (placeholders) while content loads.**
- HIG: "Show something as soon as possible… consider showing placeholder text, graphics, or animations as content loads."
  - https://developer.apple.com/design/human-interface-guidelines/loading

### 1.8 Text input

**I1. Use a text field for short input and a text view for long input. Keep a visible label, because the placeholder disappears. Choose the right keyboard. On iOS, add a Clear button.**
- HIG: "Use a text field to request a small amount of information… To let people input larger amounts of text, use a text view." Also "Because placeholder text disappears when people start typing, it can also be useful to include a separate label." And "show the appropriate keyboard type." And "Display a Clear button in the trailing end of a text field."
  - https://developer.apple.com/design/human-interface-guidelines/text-fields
- Android: "show text that gives an example of valid input… It's also common for a text field to have a corresponding descriptive label." Also: "If the keyboard is present, move the input up into a focused state or consider attaching the text input to the keyboard."
  - https://developer.android.com/guide/topics/ui/accessibility/principles
  - https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-basics
- WCAG 3.3.2: "Labels or instructions are provided when content requires user input."
  - https://www.w3.org/TR/WCAG22/#labels-or-instructions
- Agree.

### 1.9 Feedback: toasts, snackbars, undo, status

**F1. Match the interruption to how much the message matters. Show status passively, close to the thing it describes.**
- HIG: "it often works well to display status information in a passive way… a warning about possible data loss needs to interrupt people." Also "Consider integrating status feedback into your interface."
  - https://developer.apple.com/design/human-interface-guidelines/feedback
- Material: snackbars "shouldn't interrupt the user experience, and they don't require user input to disappear". Also: "snackbars are the preferred mechanism for displaying feedback messages… Reserve Toast for cases where this cannot be done."
  - https://github.com/material-components/material-components-android/blob/master/docs/components/Snackbar.md
- The platforms differ:
  - iOS has no snackbar or toast component in the HIG. Its guidance is inline status (F1) and undo through the system (F3).
  - Android: a snackbar at the bottom, with at most one action (anatomy: text, optional action, optional close).

**F2. Confirm success only for significant actions. People expect success and need to hear about failure.**
- HIG: "It's generally best to reserve this type of confirmation for activities that are sufficiently important — because people typically expect their action or task to succeed, they only need to know when it doesn't." Also "Show people when a command can't be carried out and help them understand why."
  - https://developer.apple.com/design/human-interface-guidelines/feedback
- Android: snackbar use cases include "Data Submission… notes that the change has saved successfully."
  - https://developer.android.com/develop/ui/compose/components/snackbar
- Mild difference. Restraint is closer to the HIG and to Chronicles' "no celebration" (inference).

**F3. Undo: make the result visible, and don't override the system undo gestures. Add undo buttons only when necessary, in a toolbar.**
- HIG: "Show the results of an undo or redo." Also "Provide undo and redo buttons only when necessary… put the buttons in a toolbar." In iOS: "Avoid redefining standard gestures for undo and redo" (shake, three-finger swipe).
  - https://developer.apple.com/design/human-interface-guidelines/undo-and-redo
- Material: a snackbar can offer "the ability to perform an action, such as undoing an action that was just taken". "Snackbars are automatically dismissed when the action is clicked."
  - https://github.com/material-components/material-components-android/blob/master/docs/components/Snackbar.md
- The platforms differ:
  - Android: an Undo snackbar.
  - iOS: no component is named. A transient Undo affordance is a cross-platform app choice (inference).
- If undo is offered only in something that times out, WCAG 2.2.1 (Timing Adjustable) applies to that time limit **(inference about scope)**. Pair it with a non-timed path, or follow WCAG 3.3.4 by confirming instead.
  - https://www.w3.org/TR/WCAG22/#timing-adjustable

**F4. A status message must be announced without moving focus.**
- WCAG 4.1.3 (AA): "status messages can be programmatically determined through role or properties such that they can be presented to the user by assistive technologies without receiving focus."
  - https://www.w3.org/TR/WCAG22/#status-messages
- HIG VoiceOver: "Inform VoiceOver when visible content or layout changes occur."
  - https://developer.apple.com/design/human-interface-guidelines/voiceover
- Android: "Text rendered in snackbars is automatically provided to accessibility services."
  - https://github.com/material-components/material-components-android/blob/master/docs/components/Snackbar.md

**F5. Give feedback through more than one channel: colour, text, sound, haptics.**
- HIG: "Make sure all feedback is accessible… people can receive it whether they silence their device, look away from the screen, or use VoiceOver."
  - https://developer.apple.com/design/human-interface-guidelines/feedback
- Android: "Consider haptic feedback to help inform the user."
  - https://developer.android.com/design/ui/mobile/guides/foundations/accessibility

### 1.10 Touch targets and spacing

**X0. Targets are at least 44×44 pt on iOS and 48×48 dp on Android. WCAG 2.5.8 is a lower floor of 24×24 CSS px, or enough spacing.**
- Why: small or tightly packed targets cause mis-taps, especially with tremor or while moving.
- HIG: "a button needs a hit region of at least 44x44 pt." The accessibility table for iOS gives default 44x44 pt and minimum 28x28 pt.
  - https://developer.apple.com/design/human-interface-guidelines/buttons
  - https://developer.apple.com/design/human-interface-guidelines/accessibility
- Android: "each interactive UI element have a focusable area, or touch target size, of at least 48dpx48dp." Also "Ensure all touch targets are at least 48 dp, even if this extends past the UI element visual."
  - https://developer.android.com/guide/topics/ui/accessibility/apps
  - https://developer.android.com/design/ui/mobile/guides/foundations/accessibility
- WCAG 2.5.8 (AA): "at least 24 by 24 CSS pixels", except for Spacing, Equivalent, Inline, User Agent Control, and Essential (for example, map pins). Its intent is "to help ensure targets can be easily activated without accidentally activating an adjacent target."
  - https://www.w3.org/TR/WCAG22/#target-size-minimum
  - https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- WCAG 2.5.5 (AAA): 44 by 44 CSS px.
  - https://www.w3.org/TR/WCAG22/#target-size-enhanced
- The platforms differ: use 44 on iOS and web, 48 on Android. The hit area may extend past the visual.

**X0b. Spacing matters as much as size.**
- HIG: "add about 12 points of padding around elements that include a bezel. For elements without a bezel, about 24 points of padding."
  - https://developer.apple.com/design/human-interface-guidelines/accessibility
- Material: no fetched equivalent.

**X0c. Layout adapts to the space available. Respect safe areas and insets. Support text enlarged to 200 percent.**
- HIG: "Support larger text sizes… give people the option to enlarge text by at least 200 percent." The iOS default text size is 17 pt and the minimum is 11 pt. Also "Respecting the safe area is essential." And "Determine layout based on size classes, not device type or orientation."
  - https://developer.apple.com/design/human-interface-guidelines/accessibility
  - https://developer.apple.com/design/human-interface-guidelines/layout
- Android: "specify font size in scalable pixels (sp)". Also "Don't make the body size any smaller than 12 sp."
  - https://developer.android.com/design/ui/mobile/guides/foundations/accessibility
- WCAG 1.4.10 Reflow (AA): no two-dimensional scrolling at 320 CSS px width. Exceptions include "interfaces where it is necessary to keep toolbars in view while manipulating content".
  - https://www.w3.org/TR/WCAG22/#reflow
- Today's "nothing wraps at 320 px" rule is a stricter app choice. WCAG requires no loss of content at that width, not no wrapping (inference).

### 1.11 Accessibility

**X1. Text contrast is at least 4.5:1 (3:1 for large text).**
- WCAG 1.4.3 (AA): "a contrast ratio of at least 4.5:1… Large-scale text… at least 3:1." Text that is "part of a picture that contains significant other visual content" has no requirement, but your overlay text is not part of the picture (inference).
  - https://www.w3.org/TR/WCAG22/#contrast-minimum
- HIG table: up to 17 pt, 4.5:1. 18 pt or bold, 3:1. Check both light and dark appearances.
  - https://developer.apple.com/design/human-interface-guidelines/accessibility
- Android: below 18 sp, or bold below 14 sp, use 4.5:1. Otherwise 3:1.
  - https://developer.android.com/guide/topics/ui/accessibility/apps
- Agree.

**X2. Icons, control boundaries and states have at least 3:1 contrast against what's next to them.**
- WCAG 1.4.11 (AA): "Visual information required to identify user interface components and states" needs at least 3:1.
  - https://www.w3.org/TR/WCAG22/#non-text-contrast
- Android: "Use a 3:1 ratio between surfaces and non-text elements."
  - https://developer.android.com/design/ui/mobile/guides/foundations/accessibility
- Over a photo this is not guaranteed, which is another reason controls belong in bars (inference).

**X3. Never use colour alone to carry meaning or state.**
- WCAG 1.4.1 (A).
  - https://www.w3.org/TR/WCAG22/#use-of-color
- HIG: "Convey information with more than color alone." Toggles: "Avoid relying solely on different colors to communicate state."
  - https://developer.apple.com/design/human-interface-guidelines/accessibility
  - https://developer.apple.com/design/human-interface-guidelines/toggles
- Android: "Use more than one visual affordance."
  - https://developer.android.com/design/ui/mobile/guides/foundations/accessibility

**X4. Every control has an accessible name. Where there is a visible label, the name contains it. Meaningful images are described and decorative ones hidden. Labels in a list are unique.**
- WCAG 1.1.1 (A): a control "has a name that describes its purpose". Decoration "can be ignored by assistive technology".
  - https://www.w3.org/TR/WCAG22/#non-text-content
- WCAG 4.1.2 (A): name and role can be programmatically determined.
  - https://www.w3.org/TR/WCAG22/#name-role-value
- WCAG 2.5.3 (A): "the name contains the text that is presented visually."
  - https://www.w3.org/TR/WCAG22/#label-in-name
- HIG: "Provide alternative labels for all key interface elements." Also "Describe meaningful images." And "Exclude purely decorative images."
  - https://developer.apple.com/design/human-interface-guidelines/voiceover
- Android: "Each label must explain the semantics of a particular element." Also "When adding labels to the elements of a collection, each label must be unique."
  - https://developer.android.com/guide/topics/ui/accessibility/principles
- Agree.

**X5. Focus is visible and not hidden behind your own UI. This applies on web and with hardware keyboards.**
- WCAG 2.4.7 Focus Visible (AA).
  - https://www.w3.org/TR/WCAG22/#focus-visible
- WCAG 2.4.11 Focus Not Obscured (Minimum) (AA): the focused component "is not entirely hidden due to author-created content."
  - https://www.w3.org/TR/WCAG22/#focus-not-obscured-minimum
- Floating bars and snackbars must not cover the focused item (inference).

**X6. Gestures always have an on-screen alternative.**
- WCAG 2.5.1 (A): path-based gestures can also be done "with a single pointer without a path-based gesture".
  - https://www.w3.org/TR/WCAG22/#pointer-gestures
- WCAG 2.5.7 (AA): dragging has a non-drag alternative.
  - https://www.w3.org/TR/WCAG22/#dragging-movements
- HIG: "if you use a swipe gesture to dismiss a view, also make a button available." Custom gestures must be "Not the only way to perform an important action."
  - https://developer.apple.com/design/human-interface-guidelines/accessibility
  - https://developer.apple.com/design/human-interface-guidelines/gestures
- Android: "if your app lets users swipe on an item to dismiss it, you can expose the functionality through a custom accessibility action."
  - https://developer.android.com/guide/topics/ui/accessibility/principles
- Agree.

**X7. Headings and titles let people navigate. Group each image with its caption for screen readers.**
- HIG: "Use titles and headings to help people navigate your information hierarchy." Also: "Specify how elements are grouped, ordered, or linked" (grouping an image with its caption).
  - https://developer.apple.com/design/human-interface-guidelines/voiceover

### 1.12 Toggles, pickers, segmented controls

**C1. On iOS, a switch belongs only in a list row. Outside a list, use a toggle button. A switch's effect is immediate.**
- HIG: "Use the switch toggle style only in a list row." Also "Outside of a list, use a button that behaves like a toggle, not a switch."
  - https://developer.apple.com/design/human-interface-guidelines/toggles
- Material: switches "are best used to adjust settings and other standalone options… The effects of a switch should start immediately, without needing to save."
  - https://github.com/material-components/material-components-android/blob/master/docs/components/Switch.md
- They agree on settings use. Only the HIG restricts switches to list rows.

**C2. Choice controls by list length.**
- Short list: pull-down menu.
- Medium to long list: picker.
- Very large list: a list or table (with an index).
- Two to five closely related views or options: a segmented control. Use nouns, and either text or images, not both.
- HIG: "If you need to display a fairly short list of choices, consider using a pull-down button… if you need to present a very large set of items, consider using a list or table." Also "Aim for… no more than about five segments on iPhone." And "Use nouns or noun phrases for segment labels."
  - https://developer.apple.com/design/human-interface-guidelines/pickers
  - https://developer.apple.com/design/human-interface-guidelines/segmented-controls
- Material: menus "are less prominent and take up less space than selection controls, such as a set of radio buttons". The exposed dropdown menu is the select control. Filter chips are for filtering.
  - https://github.com/material-components/material-components-android/blob/master/docs/components/Menu.md
  - https://github.com/material-components/material-components-android/blob/master/docs/components/Chip.md
- Material: primary tabs switch content under the app bar.
  - https://github.com/material-components/material-components-android/blob/master/docs/components/Tabs.md

---

## 2. Goal-to-control matrix

"Avoid" lists what the cited source warns against, or what conflicts with a rule in Part 1.

| # | User intent | Frequency / context | iOS | Android / Material | Avoid | Source |
|---|---|---|---|---|---|---|
| 1 | Act on the item being viewed, frequently (for example reply to or edit a moment in the viewer) | Every visit; content-first screen | Symbol buttons in the bottom toolbar (iPhone) or top bar, with a VoiceOver label; at most one prominent action | Icon buttons in a docked or floating toolbar, each with a `contentDescription` | Loose buttons or pills over the photo; mixing text and icon items in one bar | https://developer.apple.com/design/human-interface-guidelines/toolbars ; https://github.com/material-components/material-components-android/blob/master/docs/components/DockedToolbar.md |
| 2 | See the content without chrome | Full-screen photo or video | Tap toggles the bars; keep essential controls reachable | Same pattern, edge-to-edge (inference for Android) | Hiding controls with no familiar way back; auto-exiting full screen | https://developer.apple.com/design/human-interface-guidelines/going-full-screen ; https://developer.android.com/design/ui/mobile/guides/foundations/system-bars |
| 3 | A rare secondary action on an item (rename, add to thread, share) | Occasional | The More (ellipsis) menu in the toolbar; optionally a context menu too | Overflow menu in the app bar or toolbar | Hiding primary actions in More; a context menu as the only path | https://developer.apple.com/design/human-interface-guidelines/pull-down-buttons ; https://developer.apple.com/design/human-interface-guidelines/context-menus |
| 4 | A shortcut on an item in a list or feed | Power use | Context menu on touch and hold; destructive item last, in red | Long-press menu, plus a custom accessibility action (inference: the menu form) | Items that exist only in the context menu; more than about three groups | https://developer.apple.com/design/human-interface-guidelines/context-menus ; https://developer.android.com/guide/topics/ui/accessibility/principles |
| 5 | Choose one of several kinds of thing to create (photo, voice, note) | Each capture | Add (+) pull-down menu of at least three items, or separate buttons if only one or two kinds | The FAB opens a menu or sheet of kinds (inference: no fetched Material rule) | A row of create buttons on the screen; a menu with fewer than three items | https://developer.apple.com/design/human-interface-guidelines/pull-down-buttons ; https://developer.android.com/develop/ui/compose/components/fab |
| 6 | Clarify an action the person started (for example leaving a draft: discard or save) | After an action they triggered | Action sheet; Cancel at the bottom; destructive item at the top | Dialog or modal bottom sheet (inference) | A plain alert when there are more than two choices; a scrolling sheet | https://developer.apple.com/design/human-interface-guidelines/action-sheets |
| 7 | A destructive action that can be undone, common (delete a moment, if restorable) | Routine | No alert; make the result visible and offer undo (F3) | Act immediately, then a snackbar with Undo | A confirm alert on every routine delete | https://developer.apple.com/design/human-interface-guidelines/alerts ; https://developer.android.com/develop/ui/compose/components/snackbar |
| 8 | A destructive action that can't be undone, uncommon | Rare | Confirm with an action sheet (from a menu) or an alert; Cancel titled "Cancel"; the specific verb ("Delete") | Confirm in a dialog | "OK" or "Yes" as button text; a destructive default or primary button; a popover warning | https://developer.apple.com/design/human-interface-guidelines/alerts ; https://developer.apple.com/design/human-interface-guidelines/buttons ; https://developer.android.com/develop/ui/compose/components/dialog ; https://www.w3.org/TR/WCAG22/#error-prevention-legal-financial-data |
| 9 | Confirm before losing work (closing an edited sheet) | On dismissing with unsaved input | Action sheet with Save, Discard and Cancel, triggered by Cancel or by swiping down | Confirmation dialog (inference) | Silent discard; dismissing on an accidental outside tap | https://developer.apple.com/design/human-interface-guidelines/sheets ; https://developer.apple.com/design/human-interface-guidelines/modality ; https://developer.apple.com/design/human-interface-guidelines/popovers |
| 10 | Undo the last action | Just after acting | System undo (shake), plus a visible restored result; dedicated buttons only if needed, in a toolbar | Snackbar action "Undo"; dismissed when tapped | Redefining the undo gestures; an undo hidden only behind a timeout (WCAG 2.2.1, inference) | https://developer.apple.com/design/human-interface-guidelines/undo-and-redo ; https://github.com/material-components/material-components-android/blob/master/docs/components/Snackbar.md ; https://www.w3.org/TR/WCAG22/#timing-adjustable |
| 11 | Navigate to a related item (a thread's next moment, a parent walk) | Browsing | A row with a disclosure indicator, or a link in content; push onto the navigation stack with the standard Back | List item or link; system Back | Sheets used to navigate; an info button used to drill in | https://developer.apple.com/design/human-interface-guidelines/lists-and-tables ; https://developer.apple.com/design/human-interface-guidelines/sheets |
| 12 | Switch between top-level areas | Constant | Tab bar, always visible, with single-word labels | Navigation bar, 3 to 5 destinations, icon and label | Actions in the tab bar; hiding or disabling tabs | https://developer.apple.com/design/human-interface-guidelines/tab-bars ; https://developer.android.com/develop/ui/compose/components/navigation-bar |
| 13 | Switch between two to five related views of the same content | Within a screen | Segmented control (at most about 5 on iPhone, nouns) | Tabs (primary or secondary) | Mixing text and icons in segments; mixing actions with selection | https://developer.apple.com/design/human-interface-guidelines/segmented-controls ; https://github.com/material-components/material-components-android/blob/master/docs/components/Tabs.md |
| 14 | Toggle a setting | Settings | A switch in a list row; outside lists, a toggle button | Switch, effective immediately | A switch outside a list (iOS); a separate Save step; colour-only state | https://developer.apple.com/design/human-interface-guidelines/toggles ; https://github.com/material-components/material-components-android/blob/master/docs/components/Switch.md |
| 15 | Pick one item from a short list (fewer than about 7, inference) | Occasional | Pull-down or pop-up menu | Exposed dropdown menu | A wheel picker for a few items | https://developer.apple.com/design/human-interface-guidelines/pickers ; https://github.com/material-components/material-components-android/blob/master/docs/components/Menu.md |
| 16 | Pick one item from a long list | Occasional | Picker (medium to long); a list or table with an index or search (very long) | List in a full-screen dialog or search view (inference) | Switching views just to show a picker; a scrolling action sheet | https://developer.apple.com/design/human-interface-guidelines/pickers ; https://developer.apple.com/design/human-interface-guidelines/action-sheets ; https://github.com/material-components/material-components-android/blob/master/docs/components/Search.md |
| 17 | Enter a short text (a title or caption) | Occasional | Text field with a visible label, the right keyboard and a Clear button; on web, font of at least 16 px (project trap) | Filled or outlined text field with a label; input moves up with the keyboard | Placeholder as the only label; a text field for long text | https://developer.apple.com/design/human-interface-guidelines/text-fields ; https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-basics ; https://www.w3.org/TR/WCAG22/#labels-or-instructions |
| 18 | Enter long text (a note) | Capture | Text view in a sheet with Cancel and Done | Full-screen dialog or screen (inference) | A popover on a phone | https://developer.apple.com/design/human-interface-guidelines/text-fields ; https://developer.apple.com/design/human-interface-guidelines/popovers |
| 19 | A status that needs no action (saved, offline, recording) | Passive | Inline status near the thing it describes, for example a toolbar subtitle; announced to VoiceOver | Inline status; a snackbar if it is transient | An alert for information only; alerts at launch; announcing nothing to screen readers | https://developer.apple.com/design/human-interface-guidelines/feedback ; https://developer.apple.com/design/human-interface-guidelines/alerts ; https://www.w3.org/TR/WCAG22/#status-messages |
| 20 | Success confirmation | After an action | Only for significant actions; otherwise nothing | Snackbar (Android lists "saved successfully" as a use) | Confirmations for routine success (HIG); celebration | https://developer.apple.com/design/human-interface-guidelines/feedback ; https://developer.android.com/develop/ui/compose/components/snackbar |
| 21 | A failure the person should know about | On error | Inline message that explains why; an alert only if action is needed | Snackbar with Retry; a dialog only if blocking | A title like "Error"; a cryptic code | https://developer.apple.com/design/human-interface-guidelines/alerts ; https://github.com/material-components/material-components-android/blob/master/docs/components/Snackbar.md |
| 22 | The primary action on a screen used while walking, one-handed (capture) | Very frequent, divided attention | One prominent control, reachable at the bottom (toolbar trailing or bottom area) (inference: reach); at least 44 pt with spacing of 12 pt or more | FAB, bottom-end, at least 48 dp | Several equally prominent buttons; small, tightly packed targets; gesture-only triggers; controls in the gesture-navigation inset | https://developer.apple.com/design/human-interface-guidelines/buttons ; https://developer.apple.com/design/human-interface-guidelines/accessibility ; https://developer.android.com/develop/ui/compose/components/fab ; https://developer.android.com/design/ui/mobile/guides/foundations/system-bars ; https://www.w3.org/TR/WCAG22/#target-size-minimum |
| 23 | Dismiss a view or sheet | Constant | Close symbol (modal) or Back symbol (stack); swipe down on sheets plus a button | Close icon or system Back | Text "Back" or "Close" (iOS); swipe as the only way | https://developer.apple.com/design/human-interface-guidelines/toolbars ; https://developer.apple.com/design/human-interface-guidelines/accessibility |
| 24 | Do a quick, scoped sub-task without losing context (for example add to a thread) | Occasional | Sheet (medium detent, grabber), one at a time | Modal bottom sheet with a drag handle | A sheet on top of a sheet; a modal hierarchy; a popover on a phone | https://developer.apple.com/design/human-interface-guidelines/sheets ; https://github.com/material-components/material-components-android/blob/master/docs/components/BottomSheet.md |
| 25 | Swipe an item to act on it (archive or delete) | Shortcut | Swipe, plus the same action reachable without the gesture | Swipe, plus a custom accessibility action | Swipe as the only route | https://developer.apple.com/design/human-interface-guidelines/gestures ; https://developer.android.com/guide/topics/ui/accessibility/principles ; https://www.w3.org/TR/WCAG22/#pointer-gestures |

---

## 3. Where today's `ui-patterns.md` meets or departs from the sources

| Today's rule | What the sources say |
|---|---|
| Top bar: close or back, title, at most 2 actions and More | No fetched source gives the number 2. The HIG says "Prioritize only the most important items" and "aim for a maximum of three" groups. Keep it as an app rule (inference). |
| Bottom toolbar: 1 to 3 *labelled* actions | The HIG prefers symbols over text in toolbars, except where a symbol is unclear. Material toolbars are icon buttons with content descriptions. Labels are an app choice; never mix labelled and icon-only items (T5). |
| Nothing interactive over content | Supported in spirit (T7, V1, V2, X2). The HIG lets content extend *under* bars. Controls belong *in* bars. |
| Media laid out between the bars, not under them | Departs from current HIG ("extend it underneath… toolbars"), and Android edge-to-edge does the same. A valid app choice, but not a platform rule. |
| One primary action | Agrees: HIG toolbar "Only specify one primary action". HIG buttons allows "one or two" prominent buttons per view. FAB is one per screen. |
| A choice of several kinds is an action sheet | The HIG puts this in a pull-down menu from an Add button. It keeps action sheets for choices after an action the person started (M3, A1). |
| Targets 44 (48 Android) | Agrees (X0). WCAG 2.5.8 AA is 24×24 CSS px or spacing; 44 is AAA (2.5.5). |
| Text over a picture needs its own ground | Agrees (V4, X1). |
| Icon-only only in the top bar, with a spoken name | The spoken name agrees (X4). The "only in the top bar" limit is not in the fetched sources. |
| Inputs at least 16 px on web | Not in any fetched source. It comes from the project's own `react-native-web.md` trap. |
| Nothing wraps at 320 px | Stricter than WCAG 1.4.10, which requires no loss of content and no 2D scroll. An app choice. |
| (missing) | Context-menu items must also be in the main UI (M4); no confirm for undoable deletes (A3); one modal at a time (S2); gesture alternatives (X6); status announcements (F4); no colour-only state (X3). |

---

## 4. URLs fetched

### Apple HIG

Each page was read through its data endpoint `https://developer.apple.com/tutorials/data/design/human-interface-guidelines/<slug>.json`. The canonical pages are `https://developer.apple.com/design/human-interface-guidelines/<slug>`.

- Loaded (HTTP 200): toolbars, tab-bars, action-sheets, menus, context-menus, pull-down-buttons, edit-menus, alerts, sheets, modality, popovers, buttons, toggles, pickers, segmented-controls, going-full-screen, playing-video, images, image-views, collections, lists-and-tables, scroll-views, text-fields, search-fields, activity-views, feedback, undo-and-redo, loading, managing-notifications, accessibility, voiceover, layout, gestures.
- Not found (HTTP 404): navigation-bars (navigation-bar guidance now lives in toolbars), photo-editors-and-viewers, inclusive-design.
- Returned only a page title through WebFetch (JavaScript-rendered, so no body): https://developer.apple.com/design/human-interface-guidelines/toolbars, …/tab-bars, …/action-sheets, …/menus. Nothing from those WebFetch results was used.

### Material Design 3

- Did not load (host blocked, ENOTFOUND or proxy 403): https://m3.material.io/components/snackbar/guidelines. No other m3.material.io page was attempted after that.
- Did not load (proxy 403): https://material.io/

### Material Components for Android docs

Base: https://raw.githubusercontent.com/material-components/material-components-android/master/docs/components/<Name>.md. Cited as the github.com/…/blob/master/… form.

- Loaded: TopAppBar, BottomAppBar, DockedToolbar, FloatingToolbar, Dialog, BottomSheet, SideSheet, Menu, FloatingActionButton, ExtendedFloatingActionButton, BottomNavigation, Button, IconButton, Chip, Switch, TextField, List, Search, Tooltip, Carousel, ProgressIndicator, Slider, Tabs, Snackbar.
- Not found (404): Toolbar, NavigationBar, Buttons, Lists.
- Could not run (GitHub API access not enabled for this session): the `gh api` directory listing.

### Material Web docs

Base: https://raw.githubusercontent.com/material-components/material-web/main/docs/components/<n>.md

- Loaded (API only, not used for rules): dialog, menu, fab, icon-button, button.
- Not found (404): snackbar.

### developer.android.com

All loaded (HTTP 200):

- https://developer.android.com/design/ui/mobile/guides/foundations/accessibility
- https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-basics
- https://developer.android.com/design/ui/mobile/guides/foundations/system-bars
- https://developer.android.com/design/ui/mobile/guides/components/material-overview (not used for rules)
- https://developer.android.com/guide/topics/ui/accessibility/apps
- https://developer.android.com/guide/topics/ui/accessibility/principles
- https://developer.android.com/develop/ui/compose/components/snackbar
- https://developer.android.com/develop/ui/compose/components/app-bars
- https://developer.android.com/develop/ui/compose/components/dialog
- https://developer.android.com/develop/ui/compose/components/bottom-sheets (little prose)
- https://developer.android.com/develop/ui/compose/components/menu
- https://developer.android.com/develop/ui/compose/components/fab
- https://developer.android.com/develop/ui/compose/components/navigation-bar
- https://developer.android.com/develop/ui/compose/components (index, not used)
- https://developer.android.com/develop/ui/compose/accessibility/api-defaults (status check only, not read)

Probed and not found (404):

- https://developer.android.com/design/ui/mobile/guides/components/snackbars
- https://developer.android.com/design/ui/mobile/guides/patterns/navigation
- https://developer.android.com/design/ui/mobile/guides/patterns/undo

### WCAG 2.2

Did not load:

- https://www.w3.org/TR/WCAG22/ (host blocked, ENOTFOUND)
- https://web.archive.org/ and https://archive.org/ (proxy 403)

Loaded from the W3C source repo. Base: https://raw.githubusercontent.com/w3c/wcag/main/

- guidelines/sc/20/contrast-minimum.html
- guidelines/sc/21/non-text-contrast.html
- guidelines/sc/22/target-size-minimum.html
- guidelines/sc/21/target-size-enhanced.html
- guidelines/sc/20/focus-visible.html
- guidelines/sc/22/focus-not-obscured-minimum.html
- guidelines/sc/20/name-role-value.html
- guidelines/sc/20/non-text-content.html
- guidelines/sc/21/pointer-gestures.html
- guidelines/sc/22/dragging-movements.html
- guidelines/sc/20/timing-adjustable.html
- guidelines/sc/20/error-prevention-legal-financial-data.html
- guidelines/sc/21/status-messages.html
- guidelines/sc/20/labels-or-instructions.html
- guidelines/sc/21/label-in-name.html
- guidelines/sc/20/use-of-color.html
- guidelines/sc/21/reflow.html
- guidelines/sc/20/pause-stop-hide.html
- understanding/22/target-size-minimum.html
- guidelines/index.html (title check: "WCAG 2.2")

### Nielsen Norman Group

- Did not load (host blocked, ENOTFOUND): https://www.nngroup.com/articles/ten-usability-heuristics/. No NN/g content is used in this file.
