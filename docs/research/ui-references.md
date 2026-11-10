<!-- Compiled Nov 9-10, 2026 by research agents for decision 0112. Read first-hand: Apple HIG (33 pages, first pass), Material Design 3 (29 pages, July-September 2026, M3 Expressive), Nielsen Norman Group (42 pages, the 10 heuristics as H1-H10), WCAG 2.2 (checked against w3.org). Not covered: an M3 page on photo or video viewers (there is none); NN/g on kebab menus and touch-and-hold. -->

<!-- Compiled Nov 9-10, 2026 by a research agent for decision 0112 (the owner asked for UI rules grounded in sources). Second pass 2026-11-10: Material Design 3 (m3.material.io), Nielsen Norman Group (nngroup.com) and WCAG 2.2 (w3.org) were read first-hand; Apple HIG was not re-fetched in this pass. -->

# UI patterns reference, from primary sources

Research for `.claude/rules/ui-patterns.md` (Chronicles). Compiled 2026-11-10; second pass the same day.

## Read this first: what is first-hand and what is not

- **Apple HIG: fetched (first pass).** The HIG site renders with JavaScript, so each page was read from Apple's own data endpoint for that page (`https://developer.apple.com/tutorials/data/design/human-interface-guidelines/<slug>.json`). That is the same content as the human-readable URL cited below. These pages are the current HIG, which includes the iOS 26 "Liquid Glass" guidance. Not re-fetched in the second pass.
- **Material Design 3 (m3.material.io): fetched (second pass).** The site renders with JavaScript. Each page's text was read from the JSON the site itself loads, `https://m3.material.io/_dsm/content/m3/<carbonVersion>/<pageId>.json` (content version `2026-10-13_06-10-19`; the page ids come from the route table in the site's `main.*.js`). One JSON holds all tabs of a page (Overview, Specs, Guidelines, Accessibility); each quote below cites the tab's human-readable URL, and every cited URL was checked to return HTTP 200 with a matching canonical link (the server answers 404 for unknown paths). The pages fetched were last updated between July and September 2026, so they include the "M3 Expressive" changes (docked and floating toolbars replace the bottom app bar; connected button groups replace segmented buttons; "app bars" replace "top app bars").
  - "Material:" now means m3.material.io. Google's Material Components for Android docs and developer.android.com (the first pass's stand-ins) are still cited where they add something M3 does not say (platform implementation, `contentDescription`, system bars); those lines are marked "MDC-Android:" or "Android:".
- **Nielsen Norman Group (nngroup.com): fetched (second pass).** Articles are server-rendered and were read as HTML. The site's search is JavaScript-only and was not usable, so articles were found by URL and by links between articles. Section 1.13 has the 10 heuristics; NN/g findings are folded into the rules as "NN/g:" lines.
- **WCAG 2.2 (w3.org): fetched (second pass).** Every WCAG quote in this file was checked against the W3C Recommendation of 12 December 2024 at https://www.w3.org/TR/WCAG22/ and, where noted, its Understanding pages at https://www.w3.org/WAI/WCAG22/Understanding/. All quotes matched the published text; two places were clarified (1.4.10's toolbar example is a note, not an exception clause; 2.4.11, 2.5.1 and 2.5.7 have notes that bear on scope). Details in section 4.

Conventions: "HIG:", "Material:", "NN/g:" and "WCAG" mark what each source says. **(inference)** marks my own reasoning, not the source's words. Apple uses points (pt), Android uses dp, and WCAG uses CSS px. In React Native, layout units map to pt on iOS, dp on Android and CSS px on web **(inference)**. NN/g writes about usability across platforms, not about one platform's conventions; where it differs from a platform guide, both are given, and NN/g's own heuristic 4 ("Follow platform and industry conventions") argues for the platform in a tie **(inference)**.

---

## 1. Patterns reference

### 1.1 Bars and toolbars

**T1. A toolbar holds actions on the current view. A tab bar only navigates between top-level sections.**
- Why: if a tab bar also triggers actions, people can no longer tell where tapping takes them versus what it does.
- HIG: "Use a tab bar to support navigation, not to provide actions… If you need to provide controls that act on elements in the current view, use a toolbar instead." Also: "In contrast to a toolbar, a tab bar is specifically for navigating between areas of an app."
  - https://developer.apple.com/design/human-interface-guidelines/tab-bars
  - https://developer.apple.com/design/human-interface-guidelines/toolbars
- Material: "Use a toolbar to provide actions related to the current page." Navigation bars "provide access to three to five destinations" and "shouldn’t be used for accessing single tasks, such as viewing one email." App bars show "page navigation controls at the top of the page. (Use a toolbar to display page actions)".
  - https://m3.material.io/components/toolbars/guidelines
  - https://m3.material.io/components/navigation-bar/guidelines
  - https://m3.material.io/components/app-bars/overview
- Agree.

**T2. Keep the tab bar visible and stable. Never hide or disable tabs.**
- Why: if the tab bar disappears, people forget which area of the app they are in.
- HIG: "If you hide the tab bar, people can forget which area of the app they're in. The exception is when a modal view covers the tab bar." And: "Don't disable or hide tab bar buttons, even when their content is unavailable… If a section is empty, explain why." Tabs carry labels: "Include tab labels… Use single words whenever possible."
  - https://developer.apple.com/design/human-interface-guidelines/tab-bars
- Material: "Destinations don't change. They should be consistent across app screens." Also "Don’t remove the labels from navigation items" and "All navigation items require a label text. It should be 1-2 words." Covering is temporary only: "Navigation bars can be temporarily covered by dialogs, bottom sheets, navigation drawers, the on-screen keyboard, or other elements needed to complete a flow. They should not be permanently obstructed on any screen." But on scroll: "Upon scroll, the navigation bar can appear or disappear. Don’t hide the navigation bar on scroll when a screen reader is active."
  - https://m3.material.io/components/navigation-bar/overview
  - https://m3.material.io/components/navigation-bar/guidelines
- Agree on labels, stable destinations, and covering only for a flow. **They differ on hide-on-scroll:** Material allows it (never with a screen reader on); the HIG warns against hiding. Keeping the bar visible satisfies both **(inference)**.

**T3. Keep the number of bar items small. Overflow goes into a More menu, and only when needed.**
- Why: people need to tell items apart and hit each one.
- HIG (iOS): "Prioritize only the most important items for inclusion in the main toolbar area… Create a More menu to include additional items." Also: "Try to include all actions in the toolbar if possible, and only add this menu if you really need it." Groups: "aim for a maximum of three."
  - https://developer.apple.com/design/human-interface-guidelines/toolbars
- Material, app bar (top): "App bars should only have one action, two if necessary." And: "If the product has many actions, place those in a toolbar. Avoid placing an overflow menu in the app bar when possible." Trailing icon buttons: "Up to two icon buttons can be placed after the headline… Avoid using these buttons to open a menu with more actions."
  - https://m3.material.io/components/app-bars/guidelines
- Material, toolbar (bottom): "When actions don’t fit in a toolbar, add a menu." Floating toolbar: "If there’s not enough space for all items, put them in an overflow menu in the trailing slot." And "Be cautious of including too many controls as it can be overwhelming."
  - https://m3.material.io/components/toolbars/guidelines
- NN/g: "Overflow menu icons are widely recognized, but hiding key actions inside them can hurt usability. Use them for secondary actions, and always prioritize clarity and proximity."
  - https://www.nngroup.com/videos/overflow-menu-icons/ (summary only; the video itself was not watched)
- Agree on few items and overflow only when needed. Material now gives a count for the top bar (one or two actions) and puts overflow in the toolbar, not the app bar. The HIG gives no hard item count.

**T4. Use the standard Back and Close controls, as symbols, not as text.**
- Why: people already know what these controls do and expect them in the usual place.
- HIG: "Use the standard Back and Close buttons… Prefer the standard symbols for each, and don't use a text label that says Back or Close."
  - https://developer.apple.com/design/human-interface-guidelines/toolbars
- Material: the app bar's leading button is "A back arrow, which returns to the previous screen". In a full-screen dialog, "the close “X” icon button should be the only navigation option in the app bar."
  - https://m3.material.io/components/app-bars/guidelines
  - https://m3.material.io/components/dialogs/guidelines
- NN/g disagrees on form: "Accompany icons with text labels or substitute icons with plain text. For example, use Back instead of < and Close instead of X." And an X is ambiguous between closing and cancelling: "use text labels rather than an X icon".
  - https://www.nngroup.com/articles/user-control-and-freedom/
  - https://www.nngroup.com/articles/cancel-vs-close/
- Both platforms use symbols; NN/g prefers words. Follow the platform symbol, and where an X could throw away work, see A7 **(inference, from NN/g heuristic 4)**.

**T5. Bar items should be recognizable symbols with a spoken name. Use text where no symbol reads clearly. Don't put text and symbol items next to each other.**
- Why: an unclear icon makes people guess. A text item next to a symbol item looks like one combined control.
- HIG: "Prefer simple, recognizable symbols for items instead of text, except for actions like edit that aren't well-represented by symbols." Also: "Keep actions with text labels separate. Placing an action with a text label next to an action with a symbol can create the illusion of a single action." And: "Prefer system-provided symbols without borders."
  - https://developer.apple.com/design/human-interface-guidelines/toolbars
- Material: "Icon buttons provide an even hierarchy of controls." And "[Don't] Avoid mixing too many different controls in the same toolbar. A consistent control design keeps things clear." On labels: "Use caution if icons are displayed without labels. Icon meaning should always be unambiguous and accessible for all users. Text labels can be omitted in specific circumstances where reduced visual impact is necessary." Icon buttons show a tooltip on hover "describing its action, rather than the name of the icon itself."
  - https://m3.material.io/components/toolbars/guidelines
  - https://m3.material.io/styles/icons/applying-icons
  - https://m3.material.io/components/icon-buttons/guidelines
- MDC-Android: "You should set a `contentDescription` on all the actions in the floating toolbar".
  - https://github.com/material-components/material-components-android/blob/master/docs/components/FloatingToolbar.md
- NN/g: "Due to the absence of a standard usage for most icons, text labels are necessary to communicate the meaning and reduce ambiguity." And: "Icon labels should be visible at all times, without any interaction from the user." Universally recognized icons are few: "The icons for home, print, and the magnifying glass for search are such instances."
  - https://www.nngroup.com/articles/icon-usability/
- **Sources split.** The HIG prefers symbols; NN/g wants visible labels; Material sits between (labels where meaning is abstract). All agree: never mix the two kinds in one bar, and every icon has a spoken name.
- **Changed since the first pass:** the first pass called labelled toolbar items "an app choice, not platform guidance". NN/g now backs visible labels, and Material cautions against unlabelled icons, so Chronicles' labelled toolbars are a source-backed choice that departs from the HIG's preference, not a house rule without support.

**T6. A bar or screen has at most one primary (emphasized) action.**
- Why: several emphasized actions compete for attention and add to the time it takes to choose.
- HIG: "Use the .prominent style for key actions such as Done or Submit… Only specify one primary action, and put it on the trailing side of the toolbar."
  - https://developer.apple.com/design/human-interface-guidelines/toolbars
- Material: "Visually emphasizing a single action more than others is an effective way to create hierarchy… Avoid emphasizing more than one action at a time." And "[Don't] Don’t emphasize multiple buttons with bold, primary colors, such as a button and FAB together." FAB: "Use a FAB for the most important action on a screen" and "[Don't] Don't display multiple FABs on a single screen". Filled buttons: "ideally for only one action on a page."
  - https://m3.material.io/components/toolbars/guidelines
  - https://m3.material.io/components/floating-action-button/guidelines
  - https://m3.material.io/components/buttons/guidelines
- Agree on one primary action. They differ on its form:
  - iOS: a prominent bar item, trailing.
  - Android: a FAB, or a filled or wide icon button in the toolbar ("Docked with embedded primary action instead of FAB").

**T7. Bars are a separate layer over content. Content may run underneath; the bar separates itself by the system's treatment, not by a custom background.**
- Why: content stays full-bleed, while controls stay visually distinct from it.
- HIG: "Differentiate controls from content… Instead of applying a solid or semi-opaque background color beneath controls, use a scroll edge effect… For full-screen background content, be sure to extend it underneath sidebars, toolbars, and tab bars." Also "Reduce the use of toolbar backgrounds and tinted controls." And: "Only use a scroll edge effect when a scroll view is behind floating interface elements."
  - https://developer.apple.com/design/human-interface-guidelines/layout
  - https://developer.apple.com/design/human-interface-guidelines/toolbars
  - https://developer.apple.com/design/human-interface-guidelines/scroll-views
- Material: app bars "should initially be the same color as the background, then fill with a contrasting color on scroll to provide visual separation from the background." Or: "consider setting the app bar container to be transparent on scroll. This allows the buttons to float above the content. Make sure icon buttons have a container fill." The floating toolbar "Floats above the body content". Tabs: "Content may scroll under the container."
  - https://m3.material.io/components/app-bars/guidelines
  - https://m3.material.io/components/toolbars/guidelines
  - https://m3.material.io/components/tabs/guidelines
- Android: "draw content behind these bars to go edge-to-edge". Also "Avoid adding interactions or touch targets under gesture navigation insets."
  - https://developer.android.com/design/ui/mobile/guides/foundations/system-bars
- Agree: content under bars, controls in bars. Material adds a condition the HIG doesn't: a bar's buttons that float over content need their own container fill.
- This qualifies Chronicles' "the picture sits between its bars" **[app]** rule: both platforms extend content under the bars. Whether React Native can draw the system glass treatment is outside this research.

**T8. (new) Don't show a bottom toolbar and the tab bar (navigation bar) at the same time.**
- Why: two bars at the bottom compete, and a toolbar with navigation in it next to a navigation bar confuses where you are.
- Material: "The toolbar and navigation bar are both placed at the bottom of the window, so should not be shown at the same time. Show the navigation bar on primary pages, and toolbars on subsequent pages with actions." Also "[DON'T] Don’t show a navigation bar and a toolbar with navigation controls at the same time".
  - https://m3.material.io/components/toolbars/guidelines
- HIG: no direct statement was fetched; T2's exception ("when a modal view covers the tab bar") allows a modal viewer with its own toolbar over the tab bar **(inference)**.
- Check Chronicles' screens that show the tab bar and a bottom toolbar together **(inference: not checked against the code in this research)**.

### 1.2 Menus and context menus

**M1. A menu holds commands revealed on request. List the important items first, group them, and keep it short.**
- Why: people scan from the top, and long menus hide the command they want.
- HIG: "Prefer listing important or frequently used menu items first." Also "Be mindful of menu length." Use separators to group. Labels are verbs: "label a menu item that initiates an action using a verb or verb phrase." And: "provide icons for all menu items in a group, or none of them."
  - https://developer.apple.com/design/human-interface-guidelines/menus
- Material: "Use a menu to show a temporary set of actions. To show actions on screen at all times, use a toolbar instead." Groups: "Vertical menu items can be grouped by adding a divider or small gap. Use groups to bundle similar actions together." And "Limit the number of gaps in a menu to one or two". The spoken name: "The accessibility label should be the same as the menu item text." With an icon beside text, "the icon’s accessibility label should be marked as decorative to avoid redundant verbalizations."
  - https://m3.material.io/components/menus/guidelines
  - https://m3.material.io/components/menus/accessibility
- NN/g: "List commands in in frequency-of-use order." And "Keep the list length manageable by including fewer than 10–12 items, to avoid choice overload and ensure that all of the contextual options are visible, without having to scroll."
  - https://www.nngroup.com/articles/contextual-menus/
- Agree.

**M2. Use a More menu for actions that don't need a prominent spot. Never use it for the view's primary actions.**
- Why: a hidden primary action is undiscoverable, and the ellipsis icon doesn't tell people what is inside.
- HIG: "Avoid putting all of a view's actions in one pull-down button. A view's primary actions need to be easily discoverable." Also: "Consider using a More pull-down button to present items that don't need prominent positions… it can also hinder discoverability."
  - https://developer.apple.com/design/human-interface-guidelines/pull-down-buttons
- Material: "[DO] Choose the most essential actions to show on screen by default" (floating toolbar), with the rest in "an overflow menu in the trailing slot". Buttons: "[DON'T] Don’t clutter your UI with too many buttons. Consider presenting low-priority actions in overflow menus or as icon buttons."
  - https://m3.material.io/components/toolbars/guidelines
  - https://m3.material.io/components/buttons/guidelines
- NN/g: "hiding key actions inside them can hurt usability. Use them for secondary actions" (overflow icons). On hidden navigation generally: "Discoverability is cut almost in half by hiding a website’s main navigation."
  - https://www.nngroup.com/videos/overflow-menu-icons/
  - https://www.nngroup.com/articles/hamburger-menus/
- Agree on all three. (The first pass marked the Android side as inference; Material now states it.)

**M3. A button that reveals related choices (for example an Add button that asks what kind of thing to add) is a menu from that button. A menu with too few items should be plain buttons instead.**
- Why: one control replaces a row of buttons. Opening a menu for one item isn't worth the extra tap.
- HIG: "An Add button could present a menu that lets people specify the item they want to add." Also: "listing a minimum of three items can help the interaction feel worthwhile. If you need to list only one or two items, consider using alternative components."
  - https://developer.apple.com/design/human-interface-guidelines/pull-down-buttons
- Material: "A FAB can… transition into a FAB menu when selected. Use a FAB menu when there are many kinds of actions relevant to the FAB." The FAB menu: "FAB menus can contain 2–6 items. These should be closely related under a single action" and "[DON'T] Don’t use a FAB menu with one item". Items keep labels: "FAB menu items should always have label text." But: "When a FAB is paired with other components, like the floating toolbar or navigation rail, don’t use the FAB menu." On small screens a menu may become a sheet: "Consider adapting menus into bottom sheets on small screens. They have more space to display additional items and longer labels."
  - https://m3.material.io/components/floating-action-button/guidelines
  - https://m3.material.io/components/fab-menu/guidelines
  - https://m3.material.io/components/menus/guidelines
- Agree on the pattern. **They differ on the minimum:** the HIG suggests three items; Material allows two in a FAB menu. With two kinds, iOS uses two buttons and Android may use a FAB menu.
- This qualifies the old rule "A choice of several kinds is an action sheet": both platforms put a "what kind to add" choice in a menu from the Add control, and keep action sheets or dialogs for choices that follow an action already started (A1).

**M4. Context menus (touch and hold) are shortcuts only. Every item must also exist in the visible interface. Put destructive items last, styled destructive.**
- Why: context menus are hidden by default, so people may never find them.
- HIG: "Always make context menu items available in the main interface, too… the context menu items that are available for a message in the Inbox are also available in the toolbar of the message view." Also "Aim for a small number of menu items." And: "list them at the end of the menu and identify them as destructive." And "Provide either a context menu or an edit menu for an item, but not both."
  - https://developer.apple.com/design/human-interface-guidelines/context-menus
- Material: "Context menus provide actions for a specific element, like an image or highlighted text, and usually open with a secondary click". A menu may open when a person "Performs a specific action to trigger the menu, like right-click or press-and-hold". But on touch, long press is first a selection gesture: "Long pressing a list item selects it".
  - https://m3.material.io/components/menus/overview
  - https://m3.material.io/components/menus/guidelines
  - https://m3.material.io/foundations/interaction/gestures
- NN/g: "Make sure the commands in contextual menus are also available from the application’s main menu… Because the default view of a contextual menu is usually hidden, users may not know it is available, or how to access it." And: "Advanced users may understand that right-clicking, control-clicking, swiping, or long-pressing will reveal a contextual menu, but not all users will know this."
  - https://www.nngroup.com/articles/contextual-menus/
- Agree that the menu is a shortcut and everything in it lives elsewhere too. **They differ on what long press does on Android:** Material's default is selection (then act from the bar), with a press-and-hold menu allowed.

**M5. (new) Unavailable menu items: hide them in an iOS context menu; show them disabled in Android menus.**
- HIG: "Hide unavailable menu items, don't dim them." (context menus)
  - https://developer.apple.com/design/human-interface-guidelines/context-menus
- Material: "When a menu item can only be used under specific conditions, it should appear disabled rather than be removed." And "Disabled menu items can receive focus but aren't selectable."
  - https://m3.material.io/components/menus/guidelines
  - https://m3.material.io/components/menus/accessibility
- NN/g: "Rather than hiding irrelevant actions, disable them so that users won’t have to try to find where menu items disappeared".
  - https://www.nngroup.com/articles/contextual-menus/
- **The platforms contradict each other.** Follow each platform (iOS hides, Android disables); NN/g sides with disabling.

### 1.3 Action sheets, alerts, dialogs and confirmation

**A1. Choices that follow an action the person started go in an action sheet (iOS) or a dialog or modal bottom sheet (Android). Use them sparingly, keep them short, and don't let them scroll.**
- Why: they interrupt the task. If they scroll, people mis-tap.
- HIG: "An action sheet is a modal view that presents choices related to an action people initiate." Also "Use action sheets sparingly." In iOS: "Use an action sheet — not a menu — to provide choices related to an action… people expect a menu to appear when they choose to reveal it." And "Avoid letting an action sheet scroll."
  - https://developer.apple.com/design/human-interface-guidelines/action-sheets
- Material: "Use a modal bottom sheet as an alternative to inline menus or simple dialogs on mobile, especially when offering a long list of action items, or when items require longer descriptions and icons." Dialogs: "Dialogs should contain a maximum of two actions." And "Most dialog content should avoid scrolling."
  - https://m3.material.io/components/bottom-sheets/guidelines
  - https://m3.material.io/components/dialogs/guidelines
- The platforms differ in form:
  - iOS: an action sheet (any short list of choices plus Cancel).
  - Android: a basic dialog when there are two choices (confirm and dismiss); a modal bottom sheet when there are more. (The first pass marked this inference; Material now states both halves.)

**A2. Action sheet and dialog button order.**
- HIG (action sheet): "Place the Cancel button at the bottom of the action sheet." Also: "Make destructive choices visually prominent. Use the destructive style… and place these buttons at the top of the action sheet."
  - https://developer.apple.com/design/human-interface-guidelines/action-sheets
- Material (dialog): "Buttons are aligned to the trailing edge of the dialog for easier interaction. The confirmation button is always closest to the edge." And "[DON'T] Don’t place dismissive actions (1) to the right of confirming actions." Stacked: "Confirming actions appear above dismissive actions."
  - https://m3.material.io/components/dialogs/guidelines
- NN/g: "Should the OK button come before or after the Cancel button? Following platform conventions is more important than optimizing an individual dialog box."
  - https://www.nngroup.com/articles/ok-cancel-or-cancel-ok/
- The platforms differ; follow each.

**A3. Don't confirm common deletes that can be undone. Do confirm uncommon, irreversible ones.**
- Why: a confirmation on every routine delete teaches people to tap through it. Then it fails to catch the one delete that matters.
- HIG: "Avoid displaying alerts for common, undoable actions, even when they're destructive… when people take an uncommon destructive action that they can't undo, it's important to display an alert." Also: "don't warn people when data loss is the expected result of their action."
  - https://developer.apple.com/design/human-interface-guidelines/alerts
  - https://developer.apple.com/design/human-interface-guidelines/feedback
- Material: dialogs are "Commonly used to confirm high-risk actions like deleting progress". Snackbars: "[DO] To allow users to amend choices, display an "Undo" action".
  - https://m3.material.io/components/dialogs/overview
  - https://m3.material.io/components/snackbar/guidelines
- NN/g: "Use a confirmation dialog before committing to actions with serious consequences — such as destroying users’ work… In particular, consider a confirmation dialog before actions that cannot be undone." And "Do not use confirmation dialogs for routine actions. Like in Aesop’s fable, if you cry wolf too many times, people will stop paying attention". On swipe-to-delete: "if the action is highly repetitive and asking for confirmations would be tedious, support easy undo. Make sure that the undo option is highly salient on the screen".
  - https://www.nngroup.com/articles/confirmation-dialog/
  - https://www.nngroup.com/articles/contextual-swipe/
- All three agree: offer undo where you can, and confirm where you can't.
- WCAG 3.3.4 (AA) requires one of reversible, checked, or confirmed for "web pages that… modify or delete user-controllable data in data storage systems". The Understanding page lists "G99: Providing the ability to recover deleted information" for deletes.
  - https://www.w3.org/TR/WCAG22/#error-prevention-legal-financial-data
  - https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html

**A4. A destructive item chosen from a menu gets a confirmation step in a different place from the menu.**
- HIG: "When people choose a destructive action, the system displays an action sheet (iOS) or popover (iPadOS) in which they can confirm their choice or cancel… Because an action sheet appears in a different location from the menu and requires deliberate dismissal, it can help people avoid losing data by mistake."
  - https://developer.apple.com/design/human-interface-guidelines/pull-down-buttons
- Material: a basic dialog confirms ("Basic dialogs can give people the ability to provide confirmation of a choice before committing to it").
  - https://m3.material.io/components/dialogs/guidelines
- Agree (the first pass's Android "inference" is now stated).

**A5. Confirmation copy: a specific title that says what will happen, buttons that name the action, Cancel titled "Cancel". Never make a destructive button the default.**
- Why: "OK" and "Are you sure?" are ambiguous. People press a prominent default button without reading it.
- HIG: "Avoid using OK as the default button title unless the alert is purely informational." Also: "Always use 'Cancel' to title a button that cancels the alert's action." Also "Avoid using an alert merely to provide information." And "Avoid showing an alert when your app starts." A destructive style marks only a destructive action "people didn't deliberately choose". From the buttons page: "Don't assign the primary role to a button that performs a destructive action, even if that action is the most likely choice."
  - https://developer.apple.com/design/human-interface-guidelines/alerts
  - https://developer.apple.com/design/human-interface-guidelines/buttons
- Material: headlines should "Contain a brief, clear statement or question" and "Avoid apologies (“Sorry for the interruption”), alarm (“Warning!”), or ambiguity (“Are you sure?”)". "If a single action is provided, it must be an acknowledgement action. If two actions are provided, one must be a confirming action, and the other a dismissing action". And "Dialogs are purposefully interruptive, so they should be used sparingly."
  - https://m3.material.io/components/dialogs/guidelines
- NN/g: "Be specific and inform users about the consequence of their action. Do not ask Are you sure you want to do this?" And "Instead of Yes/No answers, provide response options that summarize what will happen for each possible response. For example, in the case of file deletion, use buttons labeled Delete file and Keep file." And "Avoid giving confirmation dialogs a default Yes answer."
  - https://www.nngroup.com/articles/confirmation-dialog/
- Agree.

**A6. (new) A dialog has at most two actions; anything more is a sheet or a screen.**
- Material: "Dialogs should contain a maximum of two actions." And "Providing a third action, such as Learn more, is not recommended as it navigates the user away from the dialog".
  - https://m3.material.io/components/dialogs/guidelines
- HIG: no fetched two-button limit for alerts; three choices go in an action sheet (A1, matrix row 9) **(inference: an iOS alert with three buttons is not ruled out by the fetched text)**.
- Android rule; on iOS prefer an action sheet for three or more choices.

**A7. (new) Make Close and Cancel distinct where closing could throw away work.**
- Why: an X can mean "dismiss and keep" or "abandon"; guessing wrong loses work.
- NN/g: "When users intend to dismiss a modal or view by clicking the X button, but the system instead completely cancels the process and clears all their work, it is disheartening at best". Remedies: "Presenting two distinct buttons: X for closing the view (with the side effect of saving intermediate work) and Cancel for abandoning the process", or "If the X icon must be used… err on the side of caution and save any intermediate work that has been done."
  - https://www.nngroup.com/articles/cancel-vs-close/
- HIG: a sheet with edits uses Cancel (leading) and Done (trailing), and confirms on loss (S3, S4).
  - https://developer.apple.com/design/human-interface-guidelines/sheets
- Material: full-screen dialogs use the close icon or "Cancel or Back" to close, "Save" to save, and "When someone dismisses a full-screen dialog, a basic dialog should appear to confirm that they want to discard the unsaved changes."
  - https://m3.material.io/components/dialogs/guidelines
- Agree on the goal; each platform's sheet or dialog pattern already meets it.

### 1.4 Modality: sheets, full-screen modals, popovers

**S1. Use a modal only for a short, scoped task with a clear benefit. Don't build "an app within your app".**
- HIG: "Present content modally only when there's a clear benefit." Also "Aim to keep modal tasks simple, short, and streamlined." And: "avoid creating a modal experience that feels like an app within your app."
  - https://developer.apple.com/design/human-interface-guidelines/modality
- Material: "Dialogs are purposefully interruptive, so they should be used sparingly." Bottom sheet content "should be additional or secondary (not the app’s main content)".
  - https://m3.material.io/components/dialogs/guidelines
  - https://m3.material.io/components/bottom-sheets/overview
- NN/g: "Do not use modal dialogs for nonessential information that is not related to the current user flow." And bottom sheets: "A sheet is inherently a transient UI element — it is meant to support quick interactions, and it should not be used for displaying complex content."
  - https://www.nngroup.com/articles/modal-nonmodal-dialog/
  - https://www.nngroup.com/articles/bottom-sheet/
- Agree.

**S2. Show one modal at a time. Close the first sheet before opening another.**
- Why: stacked modals hide where the person came from.
- HIG: "Let people dismiss a modal view before presenting another one." Also "Display only one sheet at a time from the main interface." And "Show one popover at a time."
  - https://developer.apple.com/design/human-interface-guidelines/modality
  - https://developer.apple.com/design/human-interface-guidelines/sheets
  - https://developer.apple.com/design/human-interface-guidelines/popovers
- Material: "Because they take up the entire screen, full-screen dialogs are the only dialogs over which other dialogs can appear."
  - https://m3.material.io/components/dialogs/guidelines
- NN/g: "Do Not Stack Bottom Sheets… users will have to keep track of where they currently are in the rapidly multiplying stack of overlays".
  - https://www.nngroup.com/articles/bottom-sheet/
- Agree.
- This matches the project's existing trap "iOS can't present a Modal over a Modal".

**S3. Sheet and full-screen-dialog buttons.**
- HIG: "for sheets with a single view, the Cancel button belongs on the leading edge of the top toolbar. When present, the Done button belongs on the trailing edge." Also "If you provide a Done button, always pair it with a Cancel button… Avoid showing all three buttons — Cancel, Done, and Back — together."
  - https://developer.apple.com/design/human-interface-guidelines/sheets
- Material (full-screen dialog): "To save a selection in a full-screen dialog, use Save. The close icon or dismissive action, such as Cancel or Back, should close the dialog." And "The confirmation action should be clear about what happens next, like Send or Create. Avoid using vague terms like Done, OK, or Close."
  - https://m3.material.io/components/dialogs/guidelines
- The platforms differ: iOS Cancel and Done; Android close X and a specific verb (Save, Send, Create).

**S4. Dismissing sheets: support swipe down and a visible way out; on a resizable sheet show a handle that also works without dragging. If dismissing would lose work, ask first.**
- HIG: "Support swiping to dismiss a sheet… If people have unsaved changes in the sheet when they begin swiping to dismiss it, use an action sheet to let them confirm." Also "Include a grabber in a resizable sheet… a grabber also works with VoiceOver." And "consider supporting the medium detent to allow progressive disclosure."
  - https://developer.apple.com/design/human-interface-guidelines/sheets
- HIG modality: "if closing the view could result in the loss of user-generated content, be sure to explain the situation and give people ways to resolve it… you might present an action sheet that includes a save option."
  - https://developer.apple.com/design/human-interface-guidelines/modality
- Material: modal bottom sheets are dismissed by "Tapping a menu item or action within the bottom sheet; Tapping the scrim; Swiping the sheet down; Using a close affordance within the bottom sheet’s app bar, if available" and "Display a close affordance in a full-screen modal bottom sheet." The handle: "Selecting the drag handle should toggle through preset heights or close the sheet, while selecting the scrim should always close the bottom sheet." And "Include a single-pointer alternative for any action that can be completed by dragging." Initial height: "The initial vertical position of modal bottom sheets can't exceed 50% of the screen height".
  - https://m3.material.io/components/bottom-sheets/guidelines
  - https://m3.material.io/components/bottom-sheets/accessibility
- NN/g: "include a visible a Close (or X) button on the screen… rather than relying exclusively on the grab handle" and "supporting the use of Back for dismissing the bottom sheet".
  - https://www.nngroup.com/articles/bottom-sheet/
- Agree. NN/g and Material add a visible close control and Back; the confirm-on-loss rule is in the HIG and in Material's full-screen dialog (A7).

**S5. On a phone, use a sheet instead of a popover. Never use a popover to show a warning.**
- HIG: "Avoid displaying popovers in compact views… for compact views, use all available screen space by presenting information in a full-screen modal view like a sheet instead." Also "Avoid using a popover to show a warning."
  - https://developer.apple.com/design/human-interface-guidelines/popovers
- Material: "Consider adapting menus into bottom sheets on small screens."
  - https://m3.material.io/components/menus/guidelines
- Agree in spirit.

**S6. Don't use sheets to navigate the app's content.**
- HIG: "Avoid using a sheet to help people navigate your app's content."
  - https://developer.apple.com/design/human-interface-guidelines/sheets
- Material: bottom sheet content is "additional or secondary (not the app’s main content)". On phones, "Selecting a list item should open a page with the details."
  - https://m3.material.io/components/bottom-sheets/overview
  - https://m3.material.io/components/lists/guidelines
- NN/g: "We strongly recommend not using a bottom sheet to replace typical page-to-page user flows."
  - https://www.nngroup.com/articles/bottom-sheet/
- Agree.

### 1.5 Buttons and labels

**B1. Every control needs a clear meaning. Use a familiar icon for a familiar action, and text when a short label is clearer.**
- HIG: "Ensure that each button clearly communicates its purpose." Also "Try to associate familiar actions with familiar icons." And "Consider using text when a short label communicates more clearly than an icon… consider starting the label with a verb."
  - https://developer.apple.com/design/human-interface-guidelines/buttons
- Material: "Label text is the most important element of a button. It describes the action that will occur if someone taps a button. It should be very brief, ideally 1–3 words." Icon buttons: "These buttons should be used for common, easily understandable actions. Only use a few icon buttons at once."
  - https://m3.material.io/components/buttons/guidelines
  - https://m3.material.io/components/icon-buttons/guidelines
- NN/g: "Use the 5-second rule: if it takes you more than 5 seconds to think of an appropriate icon for something, it is unlikely that an icon can effectively communicate that meaning."
  - https://www.nngroup.com/articles/icon-usability/
- Agree.

**B2. Have one or two prominent buttons per view. Show the preferred choice with style, not size.**
- HIG: "Keep the number of prominent buttons to one or two per view." Also: "Use style — not size — to visually distinguish the preferred choice among multiple options."
  - https://developer.apple.com/design/human-interface-guidelines/buttons
- Material: filled buttons "should be used sparingly, ideally for only one action on a page." But on size, Material differs: "Buttons with primary actions should have a higher visual emphasis through size, color, or shape", and "The most important action or the main call to action (CTA) should be the largest element."
  - https://m3.material.io/components/buttons/guidelines
  - https://m3.material.io/foundations/usability/overview
- Agree on one or two. **They differ on size:** the HIG says style, not size; M3 Expressive uses size too.

**B3. Use roles: primary, cancel, destructive. A destructive action is never the primary button.**
- HIG: "A button's role can have additional effects… a destructive button uses the system red color." Also "Don't assign the primary role to a button that performs a destructive action."
  - https://developer.apple.com/design/human-interface-guidelines/buttons
- Material: the FAB is never destructive: "Avoid using a FAB for minor or destructive actions, such as: Archive or trash". The fetched M3 pages give no red or destructive colour role; dialogs name the action instead (A5).
  - https://m3.material.io/components/floating-action-button/guidelines
- iOS has a destructive role; Android relies on wording. Both keep destructive actions off the primary spot.

**B4. Custom buttons need a pressed state. A slow action shows progress inside the button.**
- HIG: "Always include a press state for a custom button." In iOS: "Configure a button to display an activity indicator when you need to provide feedback about an action that doesn't instantly complete."
  - https://developer.apple.com/design/human-interface-guidelines/buttons
- Material: toolbar and app bar icon buttons show "a touch ripple… indicating interaction feedback."
  - https://m3.material.io/components/app-bars/accessibility

**B5. Make a photo tappable by wrapping it in a button. Don't add button behaviour to an image view.**
- HIG: "Image views are typically not interactive… In rare cases where you might want an image to be interactive, configure a system-provided button to display the image instead of adding button behaviors to an image view."
  - https://developer.apple.com/design/human-interface-guidelines/image-views
- Material: "Interactive images" are among the "Visual elements that need labels".
  - https://m3.material.io/foundations/designing/elements
- In React Native: a `Pressable` with `accessibilityRole="button"` and a label around the image, not a bare touch handler (inference).

**B6. (new) Don't disable the primary floating action; remove it when it can't be used.**
- Material: "Don't disable the FAB. If the action represented in the FAB is unavailable, the FAB shouldn't appear."
  - https://m3.material.io/components/floating-action-button/accessibility
- Android rule. It contrasts with T2's "never hide tabs" (tabs are navigation; the FAB is an action) **(inference)**.

### 1.6 Media viewing (full-screen photo and video)

**V1. A full-screen photo or video may hide its bars to put content first. One familiar gesture brings them back. Essential controls must stay visible or one tap away.**
- Why: chrome competes with the photo. Hidden controls that can't be found strand the person.
- HIG: "Prioritize content by temporarily hiding toolbars and navigation controls… such as when viewing full-screen photos… let people restore the hidden elements with a familiar gesture or action like tapping, swiping down… Be sure to keep controls visible when they're essential for navigation or performing tasks." Also: "a full-screen media experience needs to make playback controls persistently available or easy to reveal." And "Let people choose when to exit full-screen mode."
  - https://developer.apple.com/design/human-interface-guidelines/going-full-screen
- HIG toolbars: "Consider temporarily hiding toolbars for a distraction-free experience… offer ways to reliably restore hidden interface elements."
  - https://developer.apple.com/design/human-interface-guidelines/toolbars
- Material: no M3 page on a photo viewer was found. Related: app bars "can remain on a page at all times, or can hide and reappear when scrolling"; toolbars "can either remain on the screen during scroll, or animate offscreen"; the full-screen carousel "is best used for immersive experiences like video articles, featured headlines, or items that are visually rich." Gestures: "Double tapping on a photo opens it to full screen" and "A photo can be pinched outward to a full screen view".
  - https://m3.material.io/components/app-bars/guidelines
  - https://m3.material.io/components/toolbars/guidelines
  - https://m3.material.io/components/carousel/guidelines
  - https://m3.material.io/foundations/interaction/gestures
- Android: "Images behind system bars", edge-to-edge.
  - https://developer.android.com/design/ui/mobile/guides/foundations/system-bars
- iOS stated. On Android, use the same tap-to-toggle approach with edge-to-edge content (inference; Material lets bars hide on scroll but says nothing about tap-to-hide).

**V2. In a viewer, controls live in the viewer's bars, never as loose buttons on the image.**
- Why: a button floating over the photo covers it and has no consistent position. People can't predict where it is or tell it apart from the content.
- This is assembled from sources, not quoted (inference). It follows from:
  - T1/T3: actions go in toolbars or a More menu.
  - T7: "Differentiate controls from content".
  - V1: hide and restore the bars.
  - X2: controls over images need contrast.
- **Material is looser than this rule (new in the second pass).** It allows controls over imagery in three cases: the full-screen carousel "can contain text and other UI elements on top of the image"; a transparent app bar lets "the buttons to float above the content" if "icon buttons have a container fill"; and icon button containers provide "visual separation from the background image".
  - https://m3.material.io/components/carousel/guidelines
  - https://m3.material.io/components/app-bars/guidelines
  - https://m3.material.io/components/icon-buttons/guidelines
- So V2 is a house rule stricter than Material, consistent with the HIG. In every source, a control over an image sits in a bar's position or has its own filled container with 3:1 contrast (X2); none places an unfilled control at an arbitrary spot on the image **(inference)**.
- This is the direct answer to the shipped bug.

**V3. Display video at its original aspect ratio. Use the system player, or copy its behaviour.**
- HIG: "Use the system video player to give people a familiar and convenient experience… If your app truly requires a custom video player, reference the behavior and interface of the system video player." Also "Always display video content at its original aspect ratio." Additional information should be restricted "so that it doesn't obscure media playback".
  - https://developer.apple.com/design/human-interface-guidelines/playing-video
- Material: no fetched equivalent.

**V4. Text over a photo needs contrast help, such as a shadow or a background layer.**
- HIG: "Take care when overlaying text on images… ensure the text contrasts well with the image, and consider ways to make the text object stand out, like adding a text shadow or background layer."
  - https://developer.apple.com/design/human-interface-guidelines/image-views
- Material: "[CAUTION] Use caution when placing outlined buttons on top of images. Customizing the button to have a contrasting container fill can help ensure legibility of label text." Snackbars: "Containers should be completely opaque, so that text labels remain legible."
  - https://m3.material.io/components/buttons/guidelines
  - https://m3.material.io/components/snackbar/guidelines
- WCAG 1.4.3 and 1.4.11 apply (X1, X2).
- Agree: this supports today's "Text over a picture needs its own solid ground".

**V5. Double tap zooms. Don't reuse tap or swipe for app-specific actions.**
- HIG: the standard gesture table lists Double tap: "Zoom in; zoom out if already zoomed in". Also "Avoid using a familiar gesture like tap or swipe to perform an action that's unique to your app."
  - https://developer.apple.com/design/human-interface-guidelines/gestures
- Material: "Double tap: Two quick taps allows people to zoom in and out of content." Swipe is reserved: "Swipe behavior should be reserved for related items, such as cards in a carousel, or actions such as archiving a list item."
  - https://m3.material.io/foundations/interaction/gestures
  - https://m3.material.io/components/navigation-bar/guidelines
- Agree.

### 1.7 Lists and feeds

**L1. Use lists for text and collections (rows or grids) for images. Use standard layouts.**
- HIG: "Prefer displaying text in a list or table… If you have items that vary widely in size — or you need to display a large number of images — consider using a collection instead." Also "Use the standard row or grid layout whenever possible."
  - https://developer.apple.com/design/human-interface-guidelines/lists-and-tables
  - https://developer.apple.com/design/human-interface-guidelines/collections
- Material: "Lists are vertical groups of text, icons, images, and other elements, optimized for reading comprehension." And "Place supporting visuals and primary text in the same position in each list item. Don’t vary the position of elements within a list."
  - https://m3.material.io/components/lists/guidelines
- Agree.

**L2. Keep row text short. A row that leads deeper shows a disclosure indicator (iOS). An info button only reveals details.**
- HIG: "Keep item text succinct." Also "If you need to let people drill into a list or table row's subviews, use a disclosure indicator accessory control."
  - https://developer.apple.com/design/human-interface-guidelines/lists-and-tables
- Material: "Limit supporting text to one to three lines". "In a single-action list, the entire list item performs one action, such as navigating to a new page." In a multi-action item, "Place supplementary actions, like a bookmark or menu, in the trailing position."
  - https://m3.material.io/components/lists/guidelines
- Agree; the disclosure chevron is iOS-only.

**L3. Don't change a feed's layout while someone is using it. Animate inserts and deletes. Don't nest same-direction scroll views.**
- HIG: "try to avoid changing the layout while people are viewing and interacting with it, unless it's in response to an explicit action." Also "Consider using animations to provide feedback when people insert, delete, or reorder items." And "Avoid putting a scroll view inside another scroll view with the same orientation."
  - https://developer.apple.com/design/human-interface-guidelines/collections
  - https://developer.apple.com/design/human-interface-guidelines/scroll-views

**L4. Show something immediately (placeholders) while content loads.**
- HIG: "Show something as soon as possible… consider showing placeholder text, graphics, or animations as content loads."
  - https://developer.apple.com/design/human-interface-guidelines/loading
- NN/g: "A skeleton screen is used as a placeholder for a loading page. This progress indicator is used for full-page loads and reduces the perceived loading time."
  - https://www.nngroup.com/articles/skeleton-screens/
- Agree.

**L5. (new) Swipe actions on a row are accelerators for destructive actions, always with a visible alternative and a way back.**
- Material: "Swipeable list items should include alternative ways to access hidden actions, such as a more icon." Also "The primary action must be the final end-aligned option. A full swipe triggers this action".
  - https://m3.material.io/components/lists/guidelines
- NN/g: "Limit contextual swipe to destructive actions. Burying key actions behind a contextual swipe prevents users from discovering them." And "To prevent such accidents, it’s important to always ask for confirmation or provide an easy way to undo the swipe."
  - https://www.nngroup.com/articles/contextual-swipe/
- HIG: custom gestures are "Not the only way to perform an important action" (X6).
  - https://developer.apple.com/design/human-interface-guidelines/gestures
- Agree.

### 1.8 Text input

**I1. Use a single-line field for short input and a multi-line field for long input. Keep a visible label, because the placeholder disappears. Choose the right keyboard. Offer a clear control.**
- HIG: "Use a text field to request a small amount of information… To let people input larger amounts of text, use a text view." Also "Because placeholder text disappears when people start typing, it can also be useful to include a separate label." And "show the appropriate keyboard type." And "Display a Clear button in the trailing end of a text field."
  - https://developer.apple.com/design/human-interface-guidelines/text-fields
- Material: "Every text field should have a label." And "Label text should be aligned with the input text, and always visible." Long text: "Single-line fields are not suitable for collecting long responses; use a multi-line text field or text area instead." Clear: "Clear icons let a person clear an entire input field. They appear only when input text is present." Errors: "replace supporting text with error text" and "It’s strongly recommended to show an error icon when the text field is in the error state."
  - https://m3.material.io/components/text-fields/guidelines
- Android: "If the keyboard is present, move the input up into a focused state or consider attaching the text input to the keyboard."
  - https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-basics
- NN/g: "Placeholder text within a form field makes it difficult for people to remember what information belongs in a field, and to check for and fix errors."
  - https://www.nngroup.com/articles/form-design-placeholders/
- WCAG 3.3.2 (A): "Labels or instructions are provided when content requires user input."
  - https://www.w3.org/TR/WCAG22/#labels-or-instructions
- Agree.

### 1.9 Feedback: toasts, snackbars, undo, status

**F1. Match the interruption to how much the message matters. Show status passively, close to the thing it describes.**
- HIG: "it often works well to display status information in a passive way… a warning about possible data loss needs to interrupt people." Also "Consider integrating status feedback into your interface."
  - https://developer.apple.com/design/human-interface-guidelines/feedback
- Material: a snackbar is "Low importance" and a dialog "High importance": "Choose the right component based on the importance of the message." "[DON'T] Don’t use dialogs for low- or medium-priority information. Instead use a snackbar". Snackbars "shouldn't interrupt the user experience" and "Only one snackbar may be displayed at a time."
  - https://m3.material.io/components/dialogs/guidelines
  - https://m3.material.io/components/snackbar/guidelines
- NN/g: "Indicators are contextual. They are associated with a UI element or with a piece of content, and should be shown in close proximity to that element." And "Indicators are passive."
  - https://www.nngroup.com/articles/indicators-validations-notifications/
- The platforms differ in component:
  - iOS has no snackbar or toast component in the HIG. Its guidance is inline status (F1) and undo through the system (F3).
  - Android: a snackbar at the bottom, at most one action, one at a time.

**F2. Confirm success only for significant actions. People expect success and need to hear about failure.**
- HIG: "It's generally best to reserve this type of confirmation for activities that are sufficiently important — because people typically expect their action or task to succeed, they only need to know when it doesn't." Also "Show people when a command can't be carried out and help them understand why."
  - https://developer.apple.com/design/human-interface-guidelines/feedback
- Material: snackbars "inform users of a process that an app has performed or will perform." On web an auto-dismissing one also needs inline feedback: "update the label on a "Save" button to “Saved”, and trigger an auto-dismissing snackbar that communicates the same message." General save failures: "General errors such as network issues preventing saving or submitting should appear in a basic dialog when the confirming action fails."
  - https://m3.material.io/components/snackbar/guidelines
  - https://m3.material.io/components/dialogs/guidelines
- NN/g heuristic 1: "The design should always keep users informed about what is going on, through appropriate feedback within a reasonable amount of time." Errors: "Display the error message close to the error's source."
  - https://www.nngroup.com/articles/ten-usability-heuristics/
  - https://www.nngroup.com/articles/error-message-guidelines/
- Mild difference: Material allows a snackbar for routine success. Restraint is closer to the HIG and to Chronicles' "no celebration" (inference). An inline change (the "Saved" label) satisfies all three.

**F3. Undo: make it visible and leave it there long enough to use. Don't rely on a hidden gesture, and don't override the system undo gestures.**
- HIG: "Show the results of an undo or redo." Also "Provide undo and redo buttons only when necessary… put the buttons in a toolbar." In iOS: "Avoid redefining standard gestures for undo and redo" (shake, three-finger swipe).
  - https://developer.apple.com/design/human-interface-guidelines/undo-and-redo
- Material: "[DO] To allow users to amend choices, display an "Undo" action". And: "Snackbars with actions should remain on the screen until the user takes an action on the snackbar, or dismisses it." The accessibility tab repeats it: "Snackbars with actions shouldn't auto-dismiss. This way, users can read and interact with it at their own pace." Also "Snackbars shouldn’t be the only way to access a core use case".
  - https://m3.material.io/components/snackbar/guidelines
  - https://m3.material.io/components/snackbar/accessibility
- NN/g: "Remember the shake-to-undo feature in iOS? This feature is notoriously underused because it is so hard to discover." On a timed undo: "a snackbar appears… to confirm the change has been made and to provide an option to undo. Unfortunately, the message only appears for a few seconds. Users would need to know they want to undo and act quickly in order to make use of this feature."
  - https://www.nngroup.com/articles/user-control-and-freedom/
- WCAG 2.2.1 (A): "For each time limit that is set by the content, at least one of the following is true: Turn off… Adjust… Extend…" plus exceptions. An Undo that disappears on a timer is arguably such a time limit **(inference about scope; the Understanding page does not discuss toasts)**.
  - https://www.w3.org/TR/WCAG22/#timing-adjustable
  - https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html
- **Changed since the first pass.** All three sources now point the same way: a visible Undo that stays until it is used or dismissed. On iOS, shake is not a sufficient route on its own (NN/g); on Android, the Undo snackbar persists (Material).

**F4. A status message must be announced without moving focus.**
- WCAG 4.1.3 (AA): "In content implemented using markup languages, status messages can be programmatically determined through role or properties such that they can be presented to the user by assistive technologies without receiving focus."
  - https://www.w3.org/TR/WCAG22/#status-messages
- HIG VoiceOver: "Inform VoiceOver when visible content or layout changes occur."
  - https://developer.apple.com/design/human-interface-guidelines/voiceover
- Material: "When a snackbar appears, announce the message but don't move focus." "Don't trap focus in the snackbar." And "On Android and web, use a live region with a polite (queued) announcement instead of an assertive announcement."
  - https://m3.material.io/components/snackbar/accessibility
- MDC-Android: "Text rendered in snackbars is automatically provided to accessibility services."
  - https://github.com/material-components/material-components-android/blob/master/docs/components/Snackbar.md
- Agree.

**F5. Give feedback through more than one channel: colour, text, sound, haptics.**
- HIG: "Make sure all feedback is accessible… people can receive it whether they silence their device, look away from the screen, or use VoiceOver."
  - https://developer.apple.com/design/human-interface-guidelines/feedback
- Material: the text-field error icon "highlights the error for people with visual impairments, and provides an additional sensory indicator."
  - https://m3.material.io/components/text-fields/guidelines
- Android: "Consider haptic feedback to help inform the user."
  - https://developer.android.com/design/ui/mobile/guides/foundations/accessibility

**F6. (new) A transient message must not cover navigation, the primary action, or the focused item.**
- Material: "Avoid placing a snackbar in front of frequently used touch targets or navigation." "Snackbars should appear above FABs." "[DON'T] Don’t let the snackbar fully cover elements in focus".
  - https://m3.material.io/components/snackbar/guidelines
- WCAG 2.4.11 (X5).
- Agree; this limits today's "a transient toast may cross content" to content, not controls **(inference)**.

### 1.10 Touch targets and spacing

**X0. Targets are at least 44×44 pt on iOS and 48×48 dp on Android. WCAG 2.5.8 is a lower floor of 24×24 CSS px, or enough spacing.**
- Why: small or tightly packed targets cause mis-taps, especially with tremor or while moving.
- HIG: "a button needs a hit region of at least 44x44 pt." The accessibility table for iOS gives default 44x44 pt and minimum 28x28 pt.
  - https://developer.apple.com/design/human-interface-guidelines/buttons
  - https://developer.apple.com/design/human-interface-guidelines/accessibility
- Material: "For most platforms, consider making touch targets at least 48 x 48dp. A touch target this size results in a physical size of about 9mm, regardless of screen size." It notes "iOS recommends 44 x 44dp targets." Toolbars: "All elements need a minimum 48x48dp target area to be accessible."
  - https://m3.material.io/foundations/designing/structure
  - https://m3.material.io/components/toolbars/guidelines
- Android: "Ensure all touch targets are at least 48 dp, even if this extends past the UI element visual."
  - https://developer.android.com/design/ui/mobile/guides/foundations/accessibility
- NN/g: "Interactive elements must be at least 1cm × 1cm (0.4in × 0.4in) to support adequate selection time and prevent fat-finger errors."
  - https://www.nngroup.com/articles/touch-target-size/
- WCAG 2.5.8 (AA): "The size of the target for pointer inputs is at least 24 by 24 CSS pixels", except for Spacing, Equivalent, Inline, User Agent Control, and Essential (for example, map pins). Its intent is "to help ensure targets can be easily activated without accidentally activating an adjacent target."
  - https://www.w3.org/TR/WCAG22/#target-size-minimum
  - https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- WCAG 2.5.5 (AAA): "at least 44 by 44 CSS pixels".
  - https://www.w3.org/TR/WCAG22/#target-size-enhanced
- The platforms differ: use 44 on iOS and web, 48 on Android. The hit area may extend past the visual.

**X0b. Spacing matters as much as size.**
- HIG: "add about 12 points of padding around elements that include a bezel. For elements without a bezel, about 24 points of padding."
  - https://developer.apple.com/design/human-interface-guidelines/accessibility
- Material: "In most cases, targets separated by 8dp of space or more promote balanced information density and usability."
  - https://m3.material.io/foundations/designing/structure
- NN/g: "To avoid accidental taps, targets must first be big enough, and then also spaced well enough."
  - https://www.nngroup.com/articles/touch-target-size/
- Agree in principle; the numbers differ (HIG 12 pt around bezelled controls, Material 8 dp between targets).

**X0c. Layout adapts to the space available. Respect safe areas and insets. Support text enlarged to 200 percent.**
- HIG: "Support larger text sizes… give people the option to enlarge text by at least 200 percent." The iOS default text size is 17 pt and the minimum is 11 pt. Also "Respecting the safe area is essential." And "Determine layout based on size classes, not device type or orientation."
  - https://developer.apple.com/design/human-interface-guidelines/accessibility
  - https://developer.apple.com/design/human-interface-guidelines/layout
- Material: at large text sizes, wrapping is expected, not forbidden. Navigation bar: "It’s okay for scaled text to wrap in navigation items… ensure the full label is always visible on-screen at up to 2x text sizing." Buttons: "button labels should be kept concise enough to fit within two lines after the text size is increased to 200%." Dialog headlines "fit within four lines".
  - https://m3.material.io/components/navigation-bar/accessibility
  - https://m3.material.io/components/buttons/accessibility
  - https://m3.material.io/components/dialogs/accessibility
- Android: "Don't make the body size any smaller than 12 sp."
  - https://developer.android.com/design/ui/mobile/guides/foundations/accessibility
- WCAG 1.4.10 Reflow (AA): "Content can be presented without loss of information or functionality, and without requiring scrolling in two dimensions for: Vertical scrolling content at a width equivalent to 320 CSS pixels". The exception is "parts of the content which require two-dimensional layout for usage or meaning"; Note 2 lists among its examples "interfaces where it is necessary to keep toolbars in view while manipulating content".
  - https://www.w3.org/TR/WCAG22/#reflow
- Today's "nothing wraps at 320 px" rule is a stricter app choice. WCAG requires no loss of content at that width, not no wrapping; Material expects labels to wrap at 200% text. Read the app rule at the default text size (inference).

**X0d. (new) Make targets bigger than the minimum for an app used while walking.**
- NN/g: "if an app (or mobile site) is to be used when the user is moving, targets will be harder to hit and thus should be bigger to allow for more room for error. When driving or walking, controls requiring precise manipulation will be difficult, if not impossible to use." Its example puts in-store primary actions at "approximately 2cm × 2cm".
  - https://www.nngroup.com/articles/touch-target-size/
- Material: "It may be appropriate to use larger touch targets to accommodate a larger spectrum of users."
  - https://m3.material.io/foundations/designing/structure
- Applies directly to Chronicles' capture controls (matrix row 22) **(inference)**.

### 1.11 Accessibility

**X1. Text contrast is at least 4.5:1 (3:1 for large text).**
- WCAG 1.4.3 (AA): "The visual presentation of text and images of text has a contrast ratio of at least 4.5:1… Large-scale text and images of large-scale text have a contrast ratio of at least 3:1". Text that is "part of a picture that contains significant other visual content" has no requirement, but your overlay text is not part of the picture (inference).
  - https://www.w3.org/TR/WCAG22/#contrast-minimum
- HIG table: up to 17 pt, 4.5:1. 18 pt or bold, 3:1. Check both light and dark appearances.
  - https://developer.apple.com/design/human-interface-guidelines/accessibility
- Material: small text "At least 4.5:1 against the background"; large text "(at 14 pt bold/18 pt regular and up) and graphics… At least 3:1".
  - https://m3.material.io/foundations/designing/color-contrast
- Android: below 18 sp, or bold below 14 sp, use 4.5:1. Otherwise 3:1.
  - https://developer.android.com/guide/topics/ui/accessibility/apps
- Agree.

**X2. Icons, control boundaries and states have at least 3:1 contrast against what's next to them.**
- WCAG 1.4.11 (AA): "Visual information required to identify user interface components and states" needs "a contrast ratio of at least 3:1 against adjacent color(s)".
  - https://www.w3.org/TR/WCAG22/#non-text-contrast
- Material: icon buttons: "Ensure the icon has contrast of at least 3:1 with the surface or background." Buttons: "Enabled buttons need a 3:1 contrast ratio with the background". Clustered controls: "When placing components together in a cluster, use components or types of components that each achieve at least 3:1 contrast between themselves and the background." Exception: "Standalone components, such as FABs, don’t need to meet Material's minimum contrast of 3:1 between the container and background colors because of their prominence" (the FAB's icon still needs 3:1 with its container).
  - https://m3.material.io/components/icon-buttons/accessibility
  - https://m3.material.io/components/buttons/accessibility
  - https://m3.material.io/foundations/designing/color-contrast
  - https://m3.material.io/components/floating-action-button/accessibility
- Over a photo this is not guaranteed, which is another reason controls belong in bars or in filled containers (inference).

**X3. Never use colour alone to carry meaning or state.**
- WCAG 1.4.1 (A): "Color is not used as the only visual means of conveying information, indicating an action, prompting a response, or distinguishing a visual element."
  - https://www.w3.org/TR/WCAG22/#use-of-color
- HIG: "Convey information with more than color alone." Toggles: "Avoid relying solely on different colors to communicate state."
  - https://developer.apple.com/design/human-interface-guidelines/accessibility
  - https://developer.apple.com/design/human-interface-guidelines/toggles
- Material: "To make selected items clear for everyone, don't rely on color as the only visual cue." Toggle icon buttons fill or bolden when selected "to ensure that selection is communicated through at least two properties, rather than just color."
  - https://m3.material.io/components/lists/accessibility
  - https://m3.material.io/components/icon-buttons/guidelines
- Agree.

**X4. Every control has an accessible name. Where there is a visible label, the name contains it. Meaningful images are described and decorative ones hidden. Labels in a list are unique.**
- WCAG 1.1.1 (A): a control "has a name that describes its purpose". Decoration is "implemented in a way that it can be ignored by assistive technology".
  - https://www.w3.org/TR/WCAG22/#non-text-content
- WCAG 4.1.2 (A): "the name and role can be programmatically determined".
  - https://www.w3.org/TR/WCAG22/#name-role-value
- WCAG 2.5.3 (A): "the name contains the text that is presented visually." Note: "A best practice is to have the text of the label at the start of the name."
  - https://www.w3.org/TR/WCAG22/#label-in-name
- HIG: "Provide alternative labels for all key interface elements." Also "Describe meaningful images." And "Exclude purely decorative images."
  - https://developer.apple.com/design/human-interface-guidelines/voiceover
- Material: "Labels should concisely describe an element's content, purpose and behavior." The label describes the purpose, "NOT what the icon looks like". "Don't include the element type (button, menu, etc.) in your label." "Decorative icons and images… should be annotated as decorative". Buttons: "The accessibility label for a button should match the visible label text on the button".
  - https://m3.material.io/foundations/designing/elements
  - https://m3.material.io/components/buttons/accessibility
- Android: "When adding labels to the elements of a collection, each label must be unique."
  - https://developer.android.com/guide/topics/ui/accessibility/principles
- Agree.

**X5. Focus is visible and not hidden behind your own UI. This applies on web and with hardware keyboards.**
- WCAG 2.4.7 Focus Visible (AA): "Any keyboard operable user interface has a mode of operation where the keyboard focus indicator is visible."
  - https://www.w3.org/TR/WCAG22/#focus-visible
- WCAG 2.4.11 Focus Not Obscured (Minimum) (AA): "When a user interface component receives keyboard focus, the component is not entirely hidden due to author-created content." Note 2: "Content opened by the user may obscure the component receiving focus. If the user can reveal the focused component without advancing the keyboard focus, the component with focus is not considered visually hidden".
  - https://www.w3.org/TR/WCAG22/#focus-not-obscured-minimum
- Material: dialogs: "When a dialog appears, focus should automatically land on the first interactive element"; on close, "focus returns to the interactive element that initiated the action".
  - https://m3.material.io/components/dialogs/accessibility
  - https://m3.material.io/foundations/designing/flow
- Floating bars and snackbars must not cover the focused item (F6; inference for floating bars).

**X6. Gestures always have an on-screen alternative.**
- WCAG 2.5.1 (A): "All functionality that uses multipoint or path-based gestures for operation can be operated with a single pointer without a path-based gesture, unless a multipoint or path-based gesture is essential." Its note says it "applies to web content that interprets pointer actions".
  - https://www.w3.org/TR/WCAG22/#pointer-gestures
- WCAG 2.5.7 (AA): "All functionality that uses a dragging movement for operation can be achieved by a single pointer without dragging, unless dragging is essential".
  - https://www.w3.org/TR/WCAG22/#dragging-movements
- HIG: "if you use a swipe gesture to dismiss a view, also make a button available." Custom gestures must be "Not the only way to perform an important action."
  - https://developer.apple.com/design/human-interface-guidelines/accessibility
  - https://developer.apple.com/design/human-interface-guidelines/gestures
- Material: "Include a single-pointer alternative for any action that can be completed by dragging." Swipe alternatives "can be: Single tap; Double tap; Long press; Other single-point interactions".
  - https://m3.material.io/components/bottom-sheets/accessibility
  - https://m3.material.io/components/lists/accessibility
- NN/g: "these gestures are not discoverable and have still not become standard. Make sure to include other ways to perform the actions, that don’t rely on gestures."
  - https://www.nngroup.com/articles/contextual-menus/
- Android: "if your app lets users swipe on an item to dismiss it, you can expose the functionality through a custom accessibility action."
  - https://developer.android.com/guide/topics/ui/accessibility/principles
- Agree.

**X7. Headings and titles let people navigate. Group each image with its caption for screen readers.**
- HIG: "Use titles and headings to help people navigate your information hierarchy." Also: "Specify how elements are grouped, ordered, or linked" (grouping an image with its caption).
  - https://developer.apple.com/design/human-interface-guidelines/voiceover
- Material: "Identify headings based on content hierarchy, rather than visual styling" and "Headings should not skip a level". App bar titles: "The accessibility label for a title should be the same as the content within the title."
  - https://m3.material.io/foundations/designing/structure
  - https://m3.material.io/components/app-bars/accessibility

### 1.12 Toggles, pickers, segmented controls

**C1. A switch turns one setting on or off, immediately. On iOS it belongs only in a list row; outside a list, use a toggle button.**
- HIG: "Use the switch toggle style only in a list row." Also "Outside of a list, use a button that behaves like a toggle, not a switch."
  - https://developer.apple.com/design/human-interface-guidelines/toggles
- Material: "Switches are best used to adjust settings and other standalone options." "The effects of a switch should start immediately, without needing to save." "Switches control binary options, not opposing ones… Use a connected button group instead." And "[DON'T] A switch can't replace a button." Toggle buttons are for binary actions: "Toggle buttons should be used for binary selections, such as Save or Favorite."
  - https://m3.material.io/components/switch/guidelines
  - https://m3.material.io/components/buttons/guidelines
- NN/g: "Toggle switches should take immediate effect and should not require the user to click Save or Submit to apply the new state."
  - https://www.nngroup.com/articles/toggle-switch-guidelines/
- Agree on settings use and immediacy. Only the HIG restricts switches to list rows.

**C2. Choice controls by list length.**
- Short list: a menu.
- Medium to long list: picker (iOS) or a menu that filters as you type (Android).
- Very large list: a list or table (with an index) or search.
- Two to five closely related views or options: a segmented control (iOS) or connected button group (Android). Use nouns, and either text or icons in every segment, not a mix.
- HIG: "If you need to display a fairly short list of choices, consider using a pull-down button… if you need to present a very large set of items, consider using a list or table." Also "Aim for… no more than about five segments on iPhone." And "Use nouns or noun phrases for segment labels."
  - https://developer.apple.com/design/human-interface-guidelines/pickers
  - https://developer.apple.com/design/human-interface-guidelines/segmented-controls
- Material: "A menu takes up less space than a set of radio buttons or chips." "Dropdown menu and exposed dropdown menu are now both referred to as menu". Filtering: "A menu can include a text field to filter options. This pattern is also known as autocomplete… This helps people quickly find the right option from a long list."
  - https://m3.material.io/components/menus/guidelines
  - https://m3.material.io/components/menus/overview
- Material: segmented buttons are "no longer recommended… use the connected button group instead". They were for "simple choices between two to five items"; "[DON'T] Avoid mixing icon-only labels with text labels." Connected groups "help people select options, switch views, or sort elements in a page."
  - https://m3.material.io/components/segmented-buttons/overview
  - https://m3.material.io/components/segmented-buttons/guidelines
  - https://m3.material.io/components/button-groups/overview
- Material tabs: "Tabs organize groups of related content that are at the same level of hierarchy." "Primary tabs are placed at the top of the content pane under an app bar." And "[DON'T] Don’t use a navigation bar for fewer than three destinations. Instead, use tabs."
  - https://m3.material.io/components/tabs/guidelines
  - https://m3.material.io/components/navigation-bar/guidelines

### 1.13 Nielsen Norman Group: the 10 usability heuristics

Source for all ten: Jakob Nielsen, "10 Usability Heuristics for User Interface Design", April 24, 1994, last reviewed Jan. 30, 2024: https://www.nngroup.com/articles/ten-usability-heuristics/ . Each has its own NN/g article, linked. The quote is the heuristic's text; the line after it is what it means for Chronicles **(inference throughout)**.

**H1. Visibility of system status.** "The design should always keep users informed about what is going on, through appropriate feedback within a reasonable amount of time."
- For Chronicles: a walk that is recording, a capture that saved, a replay still building: each shows its state where the person is looking (F1, F2), and is announced (F4).
- https://www.nngroup.com/articles/visibility-system-status/

**H2. Match between the system and the real world.** "The design should speak the users' language. Use words, phrases, and concepts familiar to the user, rather than internal jargon."
- For Chronicles: say "walk", "moment", "place", never "trace", "fix", "tile build" or "snap" on screen.
- https://www.nngroup.com/articles/match-system-real-world/

**H3. User control and freedom.** "Users often perform actions by mistake. They need a clearly marked "emergency exit" to leave the unwanted action without having to go through an extended process."
- For Chronicles: every sheet and viewer has an obvious way out; a deleted moment can be got back (F3, A3); an X never throws away a half-written note without asking (A7).
- https://www.nngroup.com/articles/user-control-and-freedom/

**H4. Consistency and standards.** "Users should not have to wonder whether different words, situations, or actions mean the same thing. Follow platform and industry conventions."
- For Chronicles: the same action has the same word and icon on every screen; use each platform's own patterns (this file) before house ones.
- https://www.nngroup.com/articles/consistency-and-standards/

**H5. Error prevention.** "Good error messages are important, but the best designs carefully prevent problems from occurring in the first place. Either eliminate error-prone conditions, or check for them and present users with a confirmation option before they commit to the action."
- For Chronicles: large, spaced targets for capture on the move (X0d); confirm only the rare irreversible delete (A3); slips while walking are the common error.
- https://www.nngroup.com/articles/slips/

**H6. Recognition rather than recall.** "Minimize the user's memory load by making elements, actions, and options visible… Information required to use the design (e.g. field labels or menu items) should be visible or easily retrievable when needed."
- For Chronicles: visible labels on bar actions (T5), visible field labels (I1), actions in the visible UI, not only in gestures (M4, L5).
- https://www.nngroup.com/articles/recognition-and-recall/

**H7. Flexibility and efficiency of use.** "Shortcuts — hidden from novice users — may speed up the interaction for the expert user so that the design can cater to both inexperienced and experienced users."
- For Chronicles: touch-and-hold menus and swipes are fine as shortcuts, never as the only route (M4, X6).
- https://www.nngroup.com/articles/flexibility-efficiency-heuristic/

**H8. Aesthetic and minimalist design.** "Interfaces should not contain information that is irrelevant or rarely needed. Every extra unit of information in an interface competes with the relevant units of information and diminishes their relative visibility."
- For Chronicles: the photo and the replay come first; rare actions go in More (M2); no counts or scores (the product's own rule).
- https://www.nngroup.com/articles/aesthetic-minimalist-design/

**H9. Help users recognize, diagnose, and recover from errors.** "Error messages should be expressed in plain language (no error codes), precisely indicate the problem, and constructively suggest a solution."
- For Chronicles: "Location is off. Turn it on in Settings to trace this walk", not "Error 1".
- https://www.nngroup.com/articles/error-message-guidelines/

**H10. Help and documentation.** "It’s best if the system doesn’t need any additional explanation. However, it may be necessary to provide documentation to help users understand how to complete their tasks."
- For Chronicles: explain in context (an empty section says why it is empty, as T2 asks), not in a tutorial.
- https://www.nngroup.com/articles/help-and-documentation/

---

## 2. Goal-to-control matrix

"Avoid" lists what the cited source warns against, or what conflicts with a rule in Part 1. Cells changed in the second pass are marked **(v2)** in the # column.

| # | User intent | Frequency / context | iOS | Android / Material | Avoid | Source |
|---|---|---|---|---|---|---|
| 1 (v2) | Act on the item being viewed, frequently (for example reply to or edit a moment in the viewer) | Every visit; content-first screen | Symbol buttons in the bottom toolbar (iPhone) or top bar, with a VoiceOver label; at most one prominent action | Floating or docked toolbar of icon buttons (each labelled), one emphasized action; the top app bar holds 1 or 2 actions at most; no navigation bar on the same screen | Loose buttons or pills over the photo; mixing text and icon items in one bar; two emphasized actions | https://developer.apple.com/design/human-interface-guidelines/toolbars ; https://m3.material.io/components/toolbars/guidelines ; https://m3.material.io/components/app-bars/guidelines |
| 2 (v2) | See the content without chrome | Full-screen photo or video | Tap toggles the bars; keep essential controls reachable | Edge-to-edge content; bars may hide on scroll and return; tap-to-toggle is inference (no M3 photo-viewer page) | Hiding controls with no familiar way back; auto-exiting full screen; hiding the navigation bar while a screen reader is on | https://developer.apple.com/design/human-interface-guidelines/going-full-screen ; https://m3.material.io/components/app-bars/guidelines ; https://m3.material.io/components/navigation-bar/guidelines ; https://developer.android.com/design/ui/mobile/guides/foundations/system-bars |
| 3 (v2) | A rare secondary action on an item (rename, add to thread, share) | Occasional | The More (ellipsis) menu in the toolbar; optionally a context menu too | Overflow menu in the trailing slot of the toolbar, not in the app bar | Hiding primary actions in More; a context menu as the only path; an overflow menu in the top app bar (Material) | https://developer.apple.com/design/human-interface-guidelines/pull-down-buttons ; https://m3.material.io/components/toolbars/guidelines ; https://m3.material.io/components/app-bars/guidelines ; https://www.nngroup.com/videos/overflow-menu-icons/ |
| 4 (v2) | A shortcut on an item in a list or feed | Power use | Context menu on touch and hold; destructive item last, in red; unavailable items hidden | Long press selects the item, and its actions appear in the bar; a press-and-hold menu is allowed; unavailable items disabled; plus a custom accessibility action | Items that exist only in the context menu; more than about three groups (HIG) or 10-12 items (NN/g) | https://developer.apple.com/design/human-interface-guidelines/context-menus ; https://m3.material.io/foundations/interaction/gestures ; https://m3.material.io/components/menus/guidelines ; https://www.nngroup.com/articles/contextual-menus/ |
| 5 (v2) | Choose one of several kinds of thing to create (photo, voice, note) | Each capture | Add (+) pull-down menu of at least three items, or separate buttons if only one or two kinds | FAB opening a FAB menu of 2 to 6 related items, each with icon and label; if the screen has a toolbar, no FAB menu: a toolbar button opening a menu, or a modal bottom sheet | A row of create buttons on the screen; a menu with one item; a FAB menu beside a toolbar | https://developer.apple.com/design/human-interface-guidelines/pull-down-buttons ; https://m3.material.io/components/fab-menu/guidelines ; https://m3.material.io/components/floating-action-button/guidelines |
| 6 (v2) | Clarify an action the person started (for example leaving a draft: discard or save) | After an action they triggered | Action sheet; Cancel at the bottom; destructive item at the top | Two choices: basic dialog (confirm and dismiss); three or more: modal bottom sheet | A plain alert when there are more than two choices; a dialog with three actions (Material); a scrolling sheet | https://developer.apple.com/design/human-interface-guidelines/action-sheets ; https://m3.material.io/components/dialogs/guidelines ; https://m3.material.io/components/bottom-sheets/guidelines |
| 7 (v2) | A destructive action that can be undone, common (delete a moment, if restorable) | Routine | No alert; make the result visible and offer a visible Undo that stays until used or dismissed (F3) | Act immediately, then a snackbar with Undo that stays until acted on or dismissed | A confirm alert on every routine delete; an Undo that vanishes after a few seconds | https://developer.apple.com/design/human-interface-guidelines/alerts ; https://m3.material.io/components/snackbar/guidelines ; https://www.nngroup.com/articles/confirmation-dialog/ ; https://www.nngroup.com/articles/user-control-and-freedom/ |
| 8 (v2) | A destructive action that can't be undone, uncommon | Rare | Confirm with an action sheet (from a menu) or an alert; Cancel titled "Cancel"; the specific verb ("Delete") | Basic dialog: a specific headline that says what will be lost, two actions (for example "Delete" and "Cancel") | "OK", "Yes" or "Are you sure?"; a destructive default or primary button; a popover warning | https://developer.apple.com/design/human-interface-guidelines/alerts ; https://developer.apple.com/design/human-interface-guidelines/buttons ; https://m3.material.io/components/dialogs/guidelines ; https://www.nngroup.com/articles/confirmation-dialog/ ; https://www.w3.org/TR/WCAG22/#error-prevention-legal-financial-data |
| 9 (v2) | Confirm before losing work (closing an edited sheet) | On dismissing with unsaved input | Action sheet with Save, Discard and Cancel, triggered by Cancel or by swiping down | Basic dialog confirming the discard (two actions), shown when the full-screen dialog or sheet is closed | Silent discard; dismissing on an accidental outside tap; an X whose meaning (close or cancel) is unclear | https://developer.apple.com/design/human-interface-guidelines/sheets ; https://developer.apple.com/design/human-interface-guidelines/modality ; https://m3.material.io/components/dialogs/guidelines ; https://www.nngroup.com/articles/cancel-vs-close/ |
| 10 (v2) | Undo the last action | Just after acting | A visible Undo where the person is looking (or in a toolbar), plus a visible restored result; shake still works but is not the route | Snackbar action "Undo" that stays until tapped or dismissed | Redefining the undo gestures; relying on shake alone (NN/g); an undo that times out (Material; WCAG 2.2.1, inference) | https://developer.apple.com/design/human-interface-guidelines/undo-and-redo ; https://m3.material.io/components/snackbar/accessibility ; https://www.nngroup.com/articles/user-control-and-freedom/ ; https://www.w3.org/TR/WCAG22/#timing-adjustable |
| 11 (v2) | Navigate to a related item (a thread's next moment, a parent walk) | Browsing | A row with a disclosure indicator, or a link in content; push onto the navigation stack with the standard Back | Single-action list item that opens a page; system Back and the app bar's back arrow | Sheets used to navigate; an info button used to drill in | https://developer.apple.com/design/human-interface-guidelines/lists-and-tables ; https://developer.apple.com/design/human-interface-guidelines/sheets ; https://m3.material.io/components/lists/guidelines ; https://www.nngroup.com/articles/bottom-sheet/ |
| 12 (v2) | Switch between top-level areas | Constant | Tab bar, always visible, with single-word labels | Navigation bar, 3 to 5 destinations, icon and 1-2 word label, fixed positions | Actions in the tab bar; hiding or disabling tabs (HIG); removing labels; swiping between destinations (Material) | https://developer.apple.com/design/human-interface-guidelines/tab-bars ; https://m3.material.io/components/navigation-bar/guidelines |
| 13 (v2) | Switch between two to five related views of the same content | Within a screen | Segmented control (at most about 5 on iPhone, nouns) | Connected button group (replaces the segmented button), 2 to 5; tabs when grouping content categories under the app bar | Mixing text and icons in segments; mixing actions with selection; a switch for opposing options | https://developer.apple.com/design/human-interface-guidelines/segmented-controls ; https://m3.material.io/components/button-groups/overview ; https://m3.material.io/components/segmented-buttons/guidelines ; https://m3.material.io/components/tabs/guidelines |
| 14 | Toggle a setting | Settings | A switch in a list row; outside lists, a toggle button | Switch with an inline label, effective immediately | A switch outside a list (iOS); a separate Save step; colour-only state | https://developer.apple.com/design/human-interface-guidelines/toggles ; https://m3.material.io/components/switch/guidelines ; https://www.nngroup.com/articles/toggle-switch-guidelines/ |
| 15 (v2) | Pick one item from a short list (fewer than about 7, inference) | Occasional | Pull-down or pop-up menu | Menu (M3 merged dropdown and exposed dropdown into "menu") | A wheel picker for a few items | https://developer.apple.com/design/human-interface-guidelines/pickers ; https://m3.material.io/components/menus/overview |
| 16 (v2) | Pick one item from a long list | Occasional | Picker (medium to long); a list or table with an index or search (very long) | Menu with a filter text field (autocomplete), or the search view | Switching views just to show a picker; a scrolling action sheet | https://developer.apple.com/design/human-interface-guidelines/pickers ; https://developer.apple.com/design/human-interface-guidelines/action-sheets ; https://m3.material.io/components/menus/guidelines |
| 17 (v2) | Enter a short text (a title or caption) | Occasional | Text field with a visible label, the right keyboard and a Clear button; on web, font of at least 16 px (project trap) | Text field with an always-visible label, a clear icon when filled, error text in place of supporting text; input moves up with the keyboard | Placeholder as the only label; a single-line field for long text | https://developer.apple.com/design/human-interface-guidelines/text-fields ; https://m3.material.io/components/text-fields/guidelines ; https://www.nngroup.com/articles/form-design-placeholders/ ; https://www.w3.org/TR/WCAG22/#labels-or-instructions |
| 18 (v2) | Enter long text (a note) | Capture | Text view in a sheet with Cancel and Done | Full-screen dialog: close X, a specific confirm verb (Save), multi-line field or text area; discarding asks first | A popover on a phone; "Done" or "OK" as the Android confirm label | https://developer.apple.com/design/human-interface-guidelines/text-fields ; https://developer.apple.com/design/human-interface-guidelines/popovers ; https://m3.material.io/components/dialogs/guidelines ; https://m3.material.io/components/text-fields/guidelines |
| 19 (v2) | A status that needs no action (saved, offline, recording) | Passive | Inline status near the thing it describes, for example a toolbar subtitle; announced to VoiceOver | Inline status; a snackbar if transient, announced politely without moving focus | An alert for information only; alerts at launch; announcing nothing to screen readers; a dialog for low-priority information | https://developer.apple.com/design/human-interface-guidelines/feedback ; https://m3.material.io/components/snackbar/accessibility ; https://www.nngroup.com/articles/indicators-validations-notifications/ ; https://www.w3.org/TR/WCAG22/#status-messages |
| 20 (v2) | Success confirmation | After an action | Only for significant actions; otherwise nothing | Inline change (a "Save" label becomes "Saved"); a snackbar is allowed but not required | Confirmations for routine success (HIG); celebration; on web, an auto-dismissing snackbar as the only feedback (Material) | https://developer.apple.com/design/human-interface-guidelines/feedback ; https://m3.material.io/components/snackbar/guidelines |
| 21 (v2) | A failure the person should know about | On error | Inline message that explains why; an alert only if action is needed | Field errors inline; a failed save or send in a basic dialog; snackbar for low-priority failures | A title like "Error"; a cryptic code; errors far from their cause | https://developer.apple.com/design/human-interface-guidelines/alerts ; https://m3.material.io/components/dialogs/guidelines ; https://www.nngroup.com/articles/error-message-guidelines/ |
| 22 (v2) | The primary action on a screen used while walking, one-handed (capture) | Very frequent, divided attention | One prominent control at the bottom (toolbar trailing or bottom area); at least 44 pt and larger for use on the move; spacing of 12 pt or more | Medium FAB, lower right, at least 48 dp, 8 dp or more from other targets | Several equally prominent buttons; small, tightly packed targets; gesture-only triggers; controls in the gesture-navigation inset; assuming the bottom is always easiest to reach (NN/g calls that rationale "largely incorrect") | https://developer.apple.com/design/human-interface-guidelines/buttons ; https://developer.apple.com/design/human-interface-guidelines/accessibility ; https://m3.material.io/components/floating-action-button/guidelines ; https://m3.material.io/foundations/designing/structure ; https://www.nngroup.com/articles/touch-target-size/ ; https://www.nngroup.com/articles/bottom-sheet/ ; https://www.w3.org/TR/WCAG22/#target-size-minimum |
| 23 (v2) | Dismiss a view or sheet | Constant | Close symbol (modal) or Back symbol (stack); swipe down on sheets plus a button | Back arrow or close X; system Back and predictive back; on sheets, scrim tap, swipe down and a close control on full-screen sheets | Text "Back" or "Close" (HIG; NN/g prefers text, see T4); swipe as the only way; a grab handle as the only visible way out (NN/g) | https://developer.apple.com/design/human-interface-guidelines/toolbars ; https://developer.apple.com/design/human-interface-guidelines/accessibility ; https://m3.material.io/components/bottom-sheets/guidelines ; https://www.nngroup.com/articles/bottom-sheet/ |
| 24 (v2) | Do a quick, scoped sub-task without losing context (for example add to a thread) | Occasional | Sheet (medium detent, grabber), one at a time | Modal bottom sheet, opening at no more than half the screen, drag handle that also works by tap, one at a time | A sheet on top of a sheet; a modal hierarchy; a popover on a phone; long or complex content in a sheet | https://developer.apple.com/design/human-interface-guidelines/sheets ; https://m3.material.io/components/bottom-sheets/guidelines ; https://m3.material.io/components/bottom-sheets/accessibility ; https://www.nngroup.com/articles/bottom-sheet/ |
| 25 (v2) | Swipe an item to act on it (archive or delete) | Shortcut | Swipe, plus the same action reachable without the gesture; undo or confirm | Swipe (full swipe triggers the end action), plus a More icon or other single-pointer route and a custom accessibility action | Swipe as the only route; non-destructive actions hidden behind a swipe (NN/g); a swipe that hides which item is affected | https://developer.apple.com/design/human-interface-guidelines/gestures ; https://m3.material.io/components/lists/guidelines ; https://www.nngroup.com/articles/contextual-swipe/ ; https://www.w3.org/TR/WCAG22/#pointer-gestures |

---

## 3. Where today's `ui-patterns.md` meets or departs from the sources

Compared against the rewritten `.claude/rules/ui-patterns.md` (sections "Where actions live", "Confirmation and feedback", "Layout and labels").

| Today's rule | What the sources say |
|---|---|
| Controls live in bars, menus and sheets; never as loose buttons on content. Content may run under a bar; a transient toast may cross content (T7, V2) | HIG agrees. **Material is looser:** it allows controls over imagery when they sit in a transparent app bar with filled icon buttons, in icon-button containers, or on a full-screen carousel (V2). So "never loose buttons" is now a house rule stricter than Material; any exception needs a filled container and 3:1 (X2). The toast exception holds for content only: Material says a snackbar must not sit "in front of frequently used touch targets or navigation" or cover the focused item (F6). |
| One primary action per bar or screen | Agrees with all three: HIG "Only specify one primary action"; Material "Avoid emphasizing more than one action at a time", one FAB per screen; filled button "ideally for only one action on a page" (T6). |
| A choice of several kinds to create is a pull-down menu from its button (three or more items; one or two kinds as separate buttons); an action sheet only clarifies an action already started | Agrees on iOS (M3, A1). On Android, Material's FAB menu allows two to six items, but not on a screen that also has a toolbar; three or more follow-up choices go in a modal bottom sheet, two in a dialog (M3, A1, matrix 5, 6). |
| Rare actions on an item go in More; a context menu or swipe is only a shortcut to something also in the visible UI | Agrees with all three (M2, M4, L5). Material adds: overflow belongs in the toolbar, not the top app bar. NN/g adds: swipe is for destructive actions. Unavailable items: hidden on iOS context menus, disabled on Android (M5). |
| "Capture is one tap away" applies to the capture stack; actions on an existing moment go in its toolbar or menu | Consistent with T1/T3 and M2. NN/g adds that controls used while walking should be bigger than the minimum (X0d). |
| Don't confirm a common undoable delete; act and offer Undo. Confirm a rare irreversible one with the specific verb, never "OK" | Agrees with all three (A3, A5). **New condition:** the Undo must not vanish on a short timer: Material says snackbars with actions "shouldn't auto-dismiss"; NN/g faults a few-second undo snackbar and calls shake-to-undo "notoriously underused" (F3, matrix 7, 10). The rules file should say how long Undo stays. |
| One modal at a time; overlays inside the viewer, never a Modal on a Modal | Agrees: HIG, Material (only full-screen dialogs may have dialogs over them), NN/g "Do Not Stack Bottom Sheets" (S2). |
| No confirmation for routine success; a status that needs no action sits inline and is announced without moving focus | Agrees: HIG (F2), WCAG 4.1.3, Material "announce the message but don't move focus" (F4). Material allows a snackbar for routine success but asks for inline feedback too on web. |
| Labels or icons, consistently within a bar; our toolbars are labelled **[app]**; icon-only buttons carry a spoken name | Never mixing agrees with HIG and Material (T5). **The labelled choice now has support:** NN/g says "text labels are necessary"; Material cautions against unlabelled icons. Only the HIG prefers symbols. The **[app]** marker could become "follows NN/g over the HIG's preference". |
| Targets 44 pt on iOS, 48 dp on Android; WCAG 2.5.8's minimum is 24 px | Agrees (X0). Material confirms 48 dp and adds 8 dp spacing (X0b); NN/g asks for bigger targets for use while walking (X0d). |
| Text over a picture needs its own solid ground: 3:1 for controls, 4.5:1 for text | Agrees (V4, X1, X2). Material: opaque snackbar containers; contrasting fills for buttons over images. |
| Never colour alone to show state | Agrees: WCAG 1.4.1, HIG, Material ("at least two properties, rather than just color") (X3). |
| Nothing wraps on a 320 px phone **[app]** | Stricter than WCAG 1.4.10 (no loss of content, no 2D scroll). **Material expects wrapping at large text sizes** (navigation labels at 2x, button labels in two lines at 200%; X0c). Read the app rule at the default text size, or it conflicts with text scaling. |
| Inputs are 16 px or more on the web **[app]** | Not in any fetched source. It comes from the project's own `react-native-web.md` trap. |
| In the moment viewer, the picture sits between its bars **[app]** | Departs from the HIG (content under bars, tap to hide; T7, V1) and from Android edge-to-edge. Still a valid app choice. |
| (missing) | A bottom toolbar and the tab bar should not show at once (T8, Material). A dialog has at most two actions (A6). Close vs Cancel must be distinguishable where work could be lost (A7). Sheets need a visible close control and Back, not only a grab handle (S4). The primary floating action is removed, not disabled, when unavailable (B6). Transient messages don't cover controls or focus (F6). The 10 heuristics as a review lens (1.13). |

---

## 4. URLs fetched

### Apple HIG (first pass; not re-fetched)

Each page was read through its data endpoint `https://developer.apple.com/tutorials/data/design/human-interface-guidelines/<slug>.json`. The canonical pages are `https://developer.apple.com/design/human-interface-guidelines/<slug>`.

- Loaded (HTTP 200): toolbars, tab-bars, action-sheets, menus, context-menus, pull-down-buttons, edit-menus, alerts, sheets, modality, popovers, buttons, toggles, pickers, segmented-controls, going-full-screen, playing-video, images, image-views, collections, lists-and-tables, scroll-views, text-fields, search-fields, activity-views, feedback, undo-and-redo, loading, managing-notifications, accessibility, voiceover, layout, gestures.
- Not found (HTTP 404): navigation-bars (navigation-bar guidance now lives in toolbars), photo-editors-and-viewers, inclusive-design.
- Returned only a page title through WebFetch (JavaScript-rendered, so no body): https://developer.apple.com/design/human-interface-guidelines/toolbars, …/tab-bars, …/action-sheets, …/menus. Nothing from those WebFetch results was used.

### Material Design 3 (second pass)

Method: `https://m3.material.io/<path>` returns an Angular shell (HTTP 200, with a canonical link; unknown paths return 404). The page text came from `https://m3.material.io/_dsm/content/m3/2026-10-13_06-10-19/<pageId>.json`, where `<pageId>` is the `exportedCarbonFileId` in the route table inside `https://m3.material.io/static/angular/main.de4ba8c67aed3c29.js`. (A first attempt without the `.json` suffix returned 404 for every page; with it, all returned 200.)

Content JSON loaded (HTTP 200), with the page's last update:

- components: menus (2026-07-28), toolbars (2026-07-28), app-bars (2026-07-24), navigation-bar (2026-07-28), bottom-sheets (2026-07-28), side-sheets (2026-07-28, not used), dialogs (2026-07-28), buttons (2026-07-24), button-groups (2026-09-16), floating-action-button (2026-07-27), fab-menu (2026-07-17), icon-buttons (2026-07-17), segmented-buttons (2026-09-16), switch (2026-07-17), lists (2026-08-06), text-fields (2026-09-08), snackbar (2026-07-28), tabs (2026-07-17), carousel (2026-08-18), chips (2026-07-17, not used), search (2026-07-27, not used).
- foundations: designing (accessibility: color contrast, structure, flow, elements; 2026-07-17), overview (accessibility principles; not used for rules), building-for-all (not used), usability (2026-07-17), interaction/gestures (2026-07-17), interaction/states (2026-07-17), layout/layout-overview (2026-08-18, not used).
- styles: icons (2026-07-17).

Human-readable URLs cited, each checked (HTTP 200, canonical matches):

- https://m3.material.io/components/menus/overview, …/menus/guidelines, …/menus/accessibility
- https://m3.material.io/components/toolbars/overview, …/toolbars/guidelines, …/toolbars/accessibility
- https://m3.material.io/components/app-bars/overview, …/app-bars/guidelines, …/app-bars/accessibility
- https://m3.material.io/components/navigation-bar/overview, …/navigation-bar/guidelines, …/navigation-bar/accessibility
- https://m3.material.io/components/bottom-sheets/overview, …/bottom-sheets/guidelines, …/bottom-sheets/accessibility
- https://m3.material.io/components/dialogs/overview, …/dialogs/guidelines, …/dialogs/accessibility
- https://m3.material.io/components/buttons/guidelines, …/buttons/accessibility
- https://m3.material.io/components/button-groups/overview
- https://m3.material.io/components/floating-action-button/guidelines, …/floating-action-button/accessibility
- https://m3.material.io/components/fab-menu/guidelines
- https://m3.material.io/components/icon-buttons/guidelines, …/icon-buttons/accessibility
- https://m3.material.io/components/segmented-buttons/overview, …/segmented-buttons/guidelines, …/segmented-buttons/accessibility
- https://m3.material.io/components/switch/guidelines
- https://m3.material.io/components/lists/guidelines, …/lists/accessibility
- https://m3.material.io/components/text-fields/guidelines, …/text-fields/accessibility
- https://m3.material.io/components/snackbar/guidelines, …/snackbar/accessibility
- https://m3.material.io/components/tabs/guidelines
- https://m3.material.io/components/carousel/guidelines
- https://m3.material.io/foundations/designing/structure, …/designing/color-contrast, …/designing/elements, …/designing/flow
- https://m3.material.io/foundations/interaction/gestures
- https://m3.material.io/foundations/usability/overview
- https://m3.material.io/styles/icons/applying-icons

Not found in M3: a page on photo or media viewers (no route exists in the site's route table); a destructive-colour role on any fetched page.

### Material Components for Android docs (first pass; some still cited)

Base: https://raw.githubusercontent.com/material-components/material-components-android/master/docs/components/<Name>.md. Cited as the github.com/…/blob/master/… form.

- Loaded: TopAppBar, BottomAppBar, DockedToolbar, FloatingToolbar, Dialog, BottomSheet, SideSheet, Menu, FloatingActionButton, ExtendedFloatingActionButton, BottomNavigation, Button, IconButton, Chip, Switch, TextField, List, Search, Tooltip, Carousel, ProgressIndicator, Slider, Tabs, Snackbar. Still cited in this version: FloatingToolbar, Snackbar.
- Not found (404): Toolbar, NavigationBar, Buttons, Lists.
- Could not run (GitHub API access not enabled for that session): the `gh api` directory listing.

### Material Web docs (first pass)

Base: https://raw.githubusercontent.com/material-components/material-web/main/docs/components/<n>.md

- Loaded (API only, not used for rules): dialog, menu, fab, icon-button, button.
- Not found (404): snackbar.

### developer.android.com (first pass)

All loaded (HTTP 200). Still cited: foundations/accessibility, layout-and-content/layout-basics, foundations/system-bars, accessibility/apps, accessibility/principles.

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

### WCAG 2.2 (second pass: w3.org directly)

Loaded (HTTP 200):

- https://www.w3.org/TR/WCAG22/ ("W3C Recommendation 12 December 2024"). Each cited criterion was extracted by its section id and compared word for word with the quotes in this file: 1.1.1 non-text-content, 1.4.1 use-of-color, 1.4.3 contrast-minimum, 1.4.10 reflow, 1.4.11 non-text-contrast, 2.2.1 timing-adjustable, 2.4.7 focus-visible, 2.4.11 focus-not-obscured-minimum, 2.5.1 pointer-gestures, 2.5.3 label-in-name, 2.5.5 target-size-enhanced, 2.5.7 dragging-movements, 2.5.8 target-size-minimum, 3.3.2 labels-or-instructions, 3.3.4 error-prevention-legal-financial-data, 4.1.2 name-role-value, 4.1.3 status-messages.
- https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html (the intent quote matches)
- https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html (checked for toasts or disappearing messages: not discussed, so F3's scope stays an inference)
- https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
- https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html (lists G99 for deletes)
- https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html (loaded, not quoted)

Result of the check: every first-pass quote matched the Recommendation. Changes made: quotes lengthened where the first pass paraphrased (1.4.1, 1.4.10, 2.4.7, 2.5.5, 2.5.7, 4.1.2); 1.4.10's "toolbars in view" wording is now attributed to Note 2, not called an exception; 2.4.11 Note 2 and 2.5.1's web-content note added. The first pass's source, the W3C repository `github.com/w3c/wcag` (main branch), is no longer cited.

### Nielsen Norman Group (second pass)

Loaded (HTTP 200) and cited:

- https://www.nngroup.com/articles/ten-usability-heuristics/
- https://www.nngroup.com/articles/visibility-system-status/
- https://www.nngroup.com/articles/match-system-real-world/
- https://www.nngroup.com/articles/user-control-and-freedom/
- https://www.nngroup.com/articles/consistency-and-standards/
- https://www.nngroup.com/articles/slips/
- https://www.nngroup.com/articles/recognition-and-recall/
- https://www.nngroup.com/articles/flexibility-efficiency-heuristic/
- https://www.nngroup.com/articles/aesthetic-minimalist-design/
- https://www.nngroup.com/articles/error-message-guidelines/
- https://www.nngroup.com/articles/help-and-documentation/
- https://www.nngroup.com/articles/icon-usability/
- https://www.nngroup.com/articles/contextual-menus/
- https://www.nngroup.com/articles/contextual-swipe/
- https://www.nngroup.com/articles/bottom-sheet/
- https://www.nngroup.com/articles/confirmation-dialog/
- https://www.nngroup.com/articles/touch-target-size/
- https://www.nngroup.com/articles/hamburger-menus/
- https://www.nngroup.com/articles/modal-nonmodal-dialog/
- https://www.nngroup.com/articles/indicators-validations-notifications/
- https://www.nngroup.com/articles/ok-cancel-or-cancel-ok/
- https://www.nngroup.com/articles/cancel-vs-close/
- https://www.nngroup.com/articles/form-design-placeholders/
- https://www.nngroup.com/articles/skeleton-screens/
- https://www.nngroup.com/articles/toggle-switch-guidelines/
- https://www.nngroup.com/videos/overflow-menu-icons/ (page summary only; the video needs cookies and was not watched)

Loaded, not cited: articles/menu-design, articles/mobile-navigation-patterns, articles/mobile-ux, articles/popups, articles/progress-indicators, articles/progressive-disclosure, articles/tooltip-guidelines, articles/mobile-tables, articles/mobile-faceted-search, articles/error-prevention, articles/overlay-overload, articles/screen-reader-users-on-mobile, articles/mobile-input-checklist, articles/drop-down-menus, articles/fitts-law, articles/mobile-accessibility-research.

Not found (404), guessed slugs: articles/overflow-menus, kebab-menu, kebab-menus, more-menus, mobile-menus, swipe-ambiguity, long-press, touch-and-hold, toast-notifications, snackbars, undo, destructive-actions, overlay-overuse, icons-labels, icon-labels, hidden-actions, hidden-content, discoverability, ui-discoverability, floating-action-button, toolbar, segmented-controls, checkboxes-vs-switches, image-galleries, mobile-gestures, gestures.

Could not use: https://www.nngroup.com/search/?q=… (results are rendered by JavaScript; the HTML holds no result links). So no NN/g article dedicated to kebab menus or touch-and-hold discoverability was found; those points rest on the overflow-menu video summary and the contextual-menus article.
