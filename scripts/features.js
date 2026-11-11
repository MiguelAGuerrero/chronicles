// The feature map (specs/test-organization/spec.md, TG1): one list of the
// app's features, each with the source files it owns, the e2e journeys that
// walk it, the specs whose criteria it answers and the rule file that holds
// its traps. Its unit tests are the folder of the same name under
// src/lib/__tests__/ (TG2); nothing lists them twice.
//
// Who reads it: `npm run test:feature <name>` (the folder), `check:affected`
// (which feature a change touched, and what covers each changed file),
// `check:specs` (a prefix two specs share is resolved to the features that
// list the spec) and `arch/features.test.ts`, which holds the map to the
// tree: every src file in a feature, every test folder a feature, every
// journey and spec claimed.
//
// A file may belong to more than one feature (walk.tsx is the walk screen and
// a tab's route); a test folder, a journey and a rule belong to one.
// Globs: `**` any depth, `*` within one folder, `{a,b}` either.

const FEATURES = [
  {
    name: 'arch',
    about: 'the layers, ports, fakes, the Db contract, the checks themselves',
    rule: 'functional-core',
    source: ['src/lib/types.ts', 'src/lib/{store,useStore,meta,id,focus}.ts', 'src/lib/ports/**', 'src/lib/net/**'],
    journeys: [],
    specs: ['functional-core', 'affected-checks', 'test-organization', 'shells-saved-settings', 'test-gaps', 'device-acceptance', 'vision-gate'],
  },
  {
    name: 'storage',
    about: 'the db adapters, migrations and media paths',
    rule: 'storage',
    source: ['src/lib/db/**', 'src/lib/media/**', 'src/lib/space/**', 'src/components/SpaceLine.tsx'],
    journeys: ['space', 'upgrade'],
    specs: ['storage-awareness', 'moment-table'],
  },
  {
    name: 'recording',
    about: 'the trace: fixes, the recorder, the live dot, steps, pauses, gaps in time',
    rule: 'recording-and-traces',
    source: [
      'src/lib/{geo,liveDot,glide,useLiveTrace,useGlidingWalker,steps,walkMotion,gpsLog,session,lastFix,hiddenLog,recorderRetry}.ts',
      'src/lib/shareLog/**',
      'src/lib/motionSource/**',
      'src/lib/recorder/**',
    ],
    journeys: ['hidden', 'sensors'],
    specs: ['motion', 'concept'],
  },
  {
    name: 'rides',
    about: 'a bus, trolley or train inside a walk',
    rule: 'rides',
    source: ['src/lib/rides.ts'],
    journeys: [],
    specs: ['rides'],
  },
  {
    name: 'streets',
    about: 'streets derived from tiles, the fog, snapping, tile builds',
    rule: 'streets-fog-snapping',
    source: ['src/lib/{streets,snapper,finish,tiles,tileMath,tileBuild,mapReads}.ts', 'src/lib/discovery/{tileDecode,tileFetch}.ts', 'src/lib/db/segmentBounds.ts'],
    journeys: [],
    specs: ['concept'],
  },
  {
    name: 'gaps',
    about: 'streets walked across a gap in the trace, and drawing a gap\'s way',
    rule: 'gaps',
    source: ['src/lib/gaps/**', 'src/lib/tileCollector/**', 'src/components/{GapCard,GapDraw}.tsx'],
    journeys: ['gaps'],
    specs: ['filling-gaps', 'gap-drawing'],
  },
  {
    name: 'navigation',
    about: 'the way: routes, the heading, bridges, Open in Maps, time left',
    rule: 'navigation',
    source: ['src/lib/nav/**', 'src/lib/here/**', 'src/lib/routeLeanings/**', 'src/components/{RoutePreview,RouteLeaningSettings}.tsx'],
    journeys: ['scenic', 'drive'],
    specs: ['v0.5-places', 'bridges-and-open-in-maps', 'quality-of-life', 'scenic-routes', 'drive-then-walk'],
  },
  {
    name: 'replay',
    about: 'the five beats after a walk, the summary, the quiet lines',
    rule: 'replay',
    source: ['src/app/replay/**', 'src/lib/ceremony/**', 'src/components/ceremony/**', 'src/lib/{replay,quietLines,summary}.ts', 'src/components/CaptureView.tsx', 'src/lib/viewerBars.ts'],
    journeys: ['replay'],
    specs: ['concept', 'replay-rhythm'],
  },
  {
    name: 'moments',
    about: 'moments and days: the day screen, moment pins, the moment bar',
    rule: 'moments-and-days',
    source: ['src/lib/{days,useLocate,momentPins,moment}.ts', 'src/lib/locate/**', 'src/app/day/**', 'src/components/MomentBar.tsx', 'src/lib/explore/momentFind/**'],
    journeys: ['days'],
    specs: ['moments-and-days'],
  },
  {
    name: 'walk-screen',
    about: 'Navigate as the walk screen, ready or walking: the bar, the capture stack, the settings',
    rule: 'walk-screen',
    source: [
      'src/app/walk.tsx',
      'src/app/(tabs)/navigate.tsx',
      'src/components/walk/**',
      'src/lib/readyNav.ts',
      'src/lib/pauseReminder.ts',
      'src/lib/stackSlots.ts',
      'src/lib/ready/**',
      'src/components/{Ticking,MomentBar,ConfirmCard,StartSettings,ui}.tsx',
      'src/lib/{useCaptures,walkNav,walkGate,memoGate,useLiveTrace,walkEvents,recordingBar,walkMotion,captureBus}.ts',
    ],
    journeys: ['ready', 'walk'],
    specs: ['navigate-ready'],
  },
  {
    name: 'tabs',
    about: 'the three tabs, the home sheet, the recording bar, the launch, the way to the walk screen',
    rule: 'tabs-and-home',
    source: [
      'src/app/(tabs)/**',
      'src/app/{_layout,chronicle}.tsx',
      'src/components/{StartSettings,HomeSheet,RecordingBar,SwitchRow,OpenWalk,Modal,ScreenError,SafeInsets,SafeInsets.web}.tsx',
      'src/lib/{launchRoute,launchWalk,recordingBar,walkNav,walkGate,openWalkLoad,startPlan,useStartWalk,useTabMap,memoGate,quietLines,summary,walkEvents,settleWithin,tabsHidden,captureBus,captureBand,safeInsets}.ts',
    ],
    journeys: ['tabs', 'reload', 'launch', 'capturehome'],
    specs: ['navigation-and-tabs', 'capture-from-chronicle'],
  },
  {
    name: 'presence',
    about: 'what a place is: one vocabulary of classes from every source\'s tags, read by density, marks and bars (decision 0140)',
    rule: 'explore-and-discovery',
    source: ['src/lib/presence/**'],
    // Its consumers own the journeys that show it: explore's marks, atlas and grading.
    journeys: [],
    specs: ['presence'],
  },
  {
    name: 'explore',
    about: 'the Explore tab (the atlas), discovery, marks, reminders',
    rule: 'explore-and-discovery',
    source: [
      'src/lib/discovery/**',
      'src/lib/explore/**',
      'src/lib/atlas/**',
      'src/lib/useReminded.ts',
      'src/lib/db/{exploreRow,placeRow,stores}.ts', 'src/lib/markNames.ts',
      'src/app/(tabs)/explore.tsx',
      'src/components/atlas/**',
      'src/components/{MarkPinView,ExploreSettings,ReminderCard,RemindEditor}.tsx',
    ],
    journeys: ['marks', 'atlas', 'grading', 'snap', 'carousel', 'curiosities'],
    specs: ['v1-discovery', 'explore-atlas', 'pocket-alert-nudge', 'reminder-bell', 'atlas-grading', 'town-presence', 'discrete-navigation', 'explore-carousel', 'places-worth-the-stop', 'places-pipeline', 'remarkable-and-public', 'places-out-of-town', 'presence-and-kinds', 'whole-towns', 'community-parks'],
  },
  {
    name: 'kind-walk',
    about: 'a suggested walk through where a kind is dense, opened from a kind on an area\'s card: one way, a distance, walkability said',
    rule: 'kind-walk',
    source: ['src/lib/kindWalk/**'],
    journeys: [],
    specs: ['kind-walk'],
  },
  {
    name: 'walk-planner',
    about: 'a page of its own for a kind: up to three routes on the map, a loop or one-way, a distance ceiling, density, a feel for the commitment',
    rule: 'walk-planner',
    source: ['src/lib/walkPlanner/**', 'src/components/planner/**'],
    journeys: ['planner'],
    specs: ['walk-planner', 'presence-and-kinds'],
  },
  {
    name: 'layers',
    about: 'map layers: the Layers button and panel, what is on, busy streets and town borders as layers',
    rule: 'layers',
    source: ['src/lib/layers/**', 'src/components/LayersControl.tsx'],
    journeys: ['layers'],
    specs: ['map-layers'],
  },
  {
    name: 'walkability',
    about: 'how a street treats someone on foot: the bands, the walkability layer and its icons, the area card\'s line, the heads-up',
    rule: 'walkability',
    source: ['src/lib/walk/**', 'src/components/{Tooltip,WalkBandIcon}.tsx'],
    journeys: ['walkability', 'headsup'],
    specs: ['walkability', 'walkability-headsup', 'walkability-urban-form'],
  },
  {
    name: 'landing',
    about: 'what\'s good here: landing analysis, busy streets, activity density',
    rule: 'landing',
    source: ['src/lib/landing/**', 'src/lib/activity/**', 'src/components/LandingMarks.tsx'],
    journeys: [],
    specs: ['v1.5-landing', 'activity-density'],
  },
  {
    name: 'places',
    about: 'places and areas: boundaries, assignment, the walk\'s title',
    rule: 'places-and-areas',
    source: ['src/lib/areas/**', 'src/lib/{places,placeAll}.ts', 'src/lib/backlog/**', 'src/components/{StarView,AreaPoint}.tsx'],
    journeys: ['outlines'],
    specs: ['v0.5-places', 'town-outlines', 'town-borders', 'town-presence'],
  },
  {
    name: 'map',
    about: 'the maps: pins, the scale bar, units, Locate, the compass, trace ends',
    rule: 'map',
    source: [
      'src/components/map/**',
      'src/components/{icons,CapturePinView,MarkPinView,LocateButton,CompassButton}.tsx',
      'src/lib/{pins,scaleBar,perfCount,mapReads,useTabMap,traceEnds,useLocate,units,useUnits,format,compass,mapTopInset}.ts',
      'src/lib/unitsStore/**',
    ],
    journeys: ['qol'],
    specs: ['quality-of-life', 'compass'],
  },
  {
    name: 'captures',
    about: 'notes, photos, memos and video: capture, media files, thumbnails, export',
    rule: 'captures-and-media',
    source: [
      'src/components/Capture*.tsx',
      'src/components/{Caption,Baker}*.tsx',
      'src/lib/media/**',
      'src/lib/{useCaptures,thumbPlan,thumbJob,useMediaUri,captureBus,pieceStamp,openMoment,splitPlace}.ts',
      'src/lib/split/**',
      // Moment stacks (MS1-MS21): the open moment's store, the pill and the stacked mark.
      'src/lib/momentPill/**',
      'src/components/StackMark.tsx',
      'src/lib/here/**',
      'src/lib/audioMode*.ts',
      'src/lib/export/**',
      // Media editing (ME1-ME23): the editor, edited photos and videos, the Edit offer.
      'src/components/edit/**',
      'src/components/Baker*.ts',
      'src/lib/{mediaEdit,editSession,editOffer,captionInput}.ts',
      'src/lib/{captureEdits,videoEdit}/**',
    ],
    journeys: ['edit', 'stacks'],
    specs: ['memories-on-revisit', 'media-editing', 'moment-stacks'],
  },
  {
    name: 'chronicle',
    about: 'the Chronicle tab: the walks list, months, rename, editing a note',
    rule: 'tabs-and-home',
    source: ['src/app/(tabs)/index.tsx', 'src/lib/{rename,noteEdit,months,walkTitle}.ts', 'src/components/{NoteEditor,WalkActions}.tsx'],
    journeys: ['chronicle'],
    specs: ['quality-of-life', 'section-bar'],
  },
  {
    name: 'resurface',
    about: 'Chronicle opens on Memories: a resurfaced moment, threads from the user\'s own words, Lately',
    rule: 'resurface',
    source: ['src/lib/resurface/**', 'src/components/chronicle/**'],
    journeys: ['resurface'],
    specs: ['resurfaced-moments', 'memories-context'],
  },
  {
    name: 'gallery',
    about: "Chronicle's Media: every photo, video and memo in an edge-to-edge grid under day headers; Years, Months, Days; Sort, a kind filter, pinch, square or aspect",
    rule: 'gallery',
    source: ['src/lib/gallery/**', 'src/components/gallery/**'],
    journeys: ['gallery'],
    specs: ['media-gallery'],
  },
  {
    name: 'threads',
    about: 'threads the owner makes: respond to a moment, connect moments across walks; a thread, its members and a directed reply are stored apart from the moments',
    rule: 'threads',
    source: ['src/lib/threads/**', 'src/lib/refs.ts', 'src/components/threads/**'],
    journeys: ['threads', 'responses'],
    specs: ['owner-threads', 'moment-references', 'response-thread'],
  },
  {
    name: 'motion',
    about: 'motion polish: timings, presses, entrances, haptics, the pocket alert',
    rule: 'motion-polish',
    source: ['src/lib/{motionTokens,motion,enter,zoomOut,haptics,canBuzz,canBuzz.web}.ts', 'src/components/{Enter,HomeSheet,ui}.tsx'],
    journeys: ['nudge'],
    specs: ['polish-motion', 'pocket-alert-nudge'],
  },
  {
    name: 'notify',
    about: 'notifications: reminders, the pause nudge, the service worker, openers',
    rule: 'notifications',
    source: ['src/lib/notify/**', 'src/components/pwa*.ts', 'src/components/NotificationSettings.tsx', 'src/lib/openers.ts'],
    journeys: ['notifications'],
    specs: ['v1-discovery'],
  },
  {
    name: 'deletion',
    about: 'clearing walks and moments, with undo',
    rule: 'deletion',
    source: ['src/lib/deletion/**', 'src/components/{WalkActions,UndoToast}.tsx'],
    journeys: ['deletion'],
    specs: ['clearing-walks-and-moments', 'ui-conformance'],
  },
  {
    name: 'memories',
    about: 'memories on revisit: faint pins, previews',
    rule: 'memories',
    source: ['src/lib/memories.ts', 'src/components/MemoryPreview.tsx'],
    journeys: ['memories'],
    specs: ['memories-on-revisit'],
  },
  {
    name: 'web',
    about: 'the web build\'s own styles and shims (react-native-web)',
    rule: 'react-native-web',
    source: ['src/components/webStyles*.ts'],
    journeys: [],
    specs: [],
  },
];

/**
 * Criterion ids a spec still lists that the app no longer has (TG7): retired by a
 * later call, not missing a test. `check:specs` reports them apart from live ids.
 * Keyed by the spec's slug; each entry says who retired it.
 */
const V1_SCAN_AND_AMBIENT = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S9', 'S10', 'S11', 'S12', 'S14', 'S15', 'S22', 'S23', ...Array.from({ length: 11 }, (_, i) => `A${i + 1}`)];

const RETIRED = {
  // Moved to chronicles-data with the pipeline (the owner, Nov 9, decision 0108): that repo owns the build, its
  // schemas and their tests (its docs/spec.md). PP1-PP12, PP14, PP15 were built here first; the build-side criteria
  // of Places worth the stop went with them.
  'places-pipeline': ['PP1', 'PP2', 'PP3', 'PP4', 'PP5', 'PP6', 'PP7', 'PP8', 'PP9', 'PP10', 'PP11', 'PP12', 'PP14', 'PP15'],
  'places-worth-the-stop': ['PW6', 'PW7', 'PW13', 'PW14', 'PW15', 'PW19'],
  // The walk planner (decision 0102) replaced the kind walk's in-card panel and its one way: KW1 (the row opens the kind in place),
  // KW4 (one way), KW8 (Shorter, Longer), KW9 (the start said apart from the length; WP14 says it in words) and KW9b/WP26 (too far).
  'kind-walk': ['KW1', 'KW4', 'KW8', 'KW9'],
  // As the spec says (its "Retired by this slice" line, Explore, v1 slice 5, Nov 1): S1-S6, S9-S12, S14, S15,
  // S22 and S23 of the scan, and all of slice 3's ambient hints (A1-A11). S7, S8, S13, S16 and S17 are live.
  // E14 (the test trim, Nov 5, at the owner's ask): the one-time upgrade off scan and ambient marks ran Nov 1; nothing is left to read.
  'v1-discovery': [...V1_SCAN_AND_AMBIENT, 'E14'],
  // Retired by Explore (docs/STATUS.md). L17 (the test trim, Nov 5): it fed the scan and ambient, both retired above.
  'v1.5-landing': ['L10', 'L13', 'L16', 'L17'],
  // The test trim (Nov 5, at the owner's ask): the home became the tabs (navigation-and-tabs) and Start moved to the
  // ready bar (decision 0076), so H2's empty home with its Start, and H3's one Start above the sheet, are gone.
  // H10 and N6 (the test trim, Nov 5, the owner's call): later slices changed both. Chronicle reads every capture row,
  // checklist areas, finds and photos' small copies, not only walks, summaries and areas (H10). The trace steps aside
  // while navigating (the owner, Nov 2), so N6's "the trace stays visible" no longer holds; the route's look, the pins
  // and the walker are checked by the walk and qol journeys.
  'v0.5-places': ['H2', 'H3', 'H10', 'N6'],
  // The test trim (Nov 5): Explore became an atlas (decision 0066); the tab's drawer of busy areas, places to find
  // and finds, and its "?" marks, are gone (the atlas's AT1-AT16 hold the tab now). `exploreTab.ts` went with it.
  'navigation-and-tabs': ['NV14'],
  // No Open in Maps on "Off your route" (decision 0059). NH8 (the test trim, Nov 5, the owner's call): no
  // "Couldn't open a maps app." banner was built.
  'bridges-and-open-in-maps': ['NH4', 'NH8'],
  // The test trim (Nov 5, the owner's call): a turn by hand stops following and Recenter resumes at the bearing (qol),
  // but Locate's fit turns the map back to north, so CP7 as written does not hold.
  compass: ['CP7'],
  // The test trim (Nov 5, the owner's call): memory pins never grouped by screen distance.
  'memories-on-revisit': ['MR2'],
  // The test trim (Nov 5, the owner's call): the detector reads 3 evenly spaced steps in 3 s, peaks 0.3-1.3 s apart,
  // with a dip between (steps.ts, motion audit), not MO3's 2 steps 0.3-1 s apart. MO4 holds the behaviour.
  motion: ['MO3'],
  // The test trim (Nov 5, the owner's call): the replay rhythm (decision 0085, RR1) replaced the ride's 4 s squeeze; a
  // ride is a stretch like any other, and still draws dashed (R5).
  rides: ['R10'],
  // DN5 (Nov 4): a swipe back lands back by itself, so there is no trail. DN3, DN4, DN6-DN9 (Nov 10, decision 0124): the
  // grid and the directional swipe gave way to a row of cards that a swipe steps; the new criteria are the explore-carousel spec's.
  'discrete-navigation': ['DN3', 'DN4', 'DN5', 'DN6', 'DN7', 'DN8', 'DN9'],
};

/**
 * Live criteria that no test names, on purpose (TG20): `device: <why>` for a check only a phone can
 * make (the web build can't reach it), `deferred: <why>` for the owner's call to wait. Keyed by spec.
 */
const UNTESTED = {
  // react-native-web always reports a screen reader, so the check that keeps the viewer's bars is a phone's (UC8).
  'ui-conformance': { UC8: 'device: with VoiceOver or TalkBack on, a tap on a photo leaves the viewer\'s bars up; the web build always reports a screen reader' },
  // Places out of town: queued, not started (the owner, Nov 9-10). Back to IN_PROGRESS when the slice begins.
  'places-out-of-town': {
    OP1: 'deferred: queued by the owner (decisions 0115-0118); its archive phase is re-planned as pipeline adapters in chronicles-data (0120) before the slice starts',
    OP2: 'deferred: queued by the owner (decisions 0115-0118); its archive phase is re-planned as pipeline adapters in chronicles-data (0120) before the slice starts',
    OP3: 'deferred: queued by the owner (decisions 0115-0118); its archive phase is re-planned as pipeline adapters in chronicles-data (0120) before the slice starts',
    OP4: 'deferred: queued by the owner (decisions 0115-0118); its archive phase is re-planned as pipeline adapters in chronicles-data (0120) before the slice starts',
    OP5: 'deferred: queued by the owner (decisions 0115-0118); its archive phase is re-planned as pipeline adapters in chronicles-data (0120) before the slice starts',
    OP6: 'deferred: queued by the owner (decisions 0115-0118); its archive phase is re-planned as pipeline adapters in chronicles-data (0120) before the slice starts',
    OP7: 'deferred: queued by the owner (decisions 0115-0118); its archive phase is re-planned as pipeline adapters in chronicles-data (0120) before the slice starts',
    OP8: 'deferred: queued by the owner (decisions 0115-0118); its archive phase is re-planned as pipeline adapters in chronicles-data (0120) before the slice starts',
    OP9: 'deferred: queued by the owner (decisions 0115-0118); its archive phase is re-planned as pipeline adapters in chronicles-data (0120) before the slice starts',
    OP10: 'deferred: queued by the owner (decisions 0115-0118); its archive phase is re-planned as pipeline adapters in chronicles-data (0120) before the slice starts',
    OP11: 'deferred: queued by the owner (decisions 0115-0118); its archive phase is re-planned as pipeline adapters in chronicles-data (0120) before the slice starts',
    OP12: 'deferred: queued by the owner (decisions 0115-0118); its archive phase is re-planned as pipeline adapters in chronicles-data (0120) before the slice starts',
    OP13: 'deferred: queued by the owner (decisions 0115-0118); its archive phase is re-planned as pipeline adapters in chronicles-data (0120) before the slice starts',
    OP14: 'deferred: queued by the owner (decisions 0115-0118); its archive phase is re-planned as pipeline adapters in chronicles-data (0120) before the slice starts',
    OP15: 'deferred: queued by the owner (decisions 0115-0118); its archive phase is re-planned as pipeline adapters in chronicles-data (0120) before the slice starts',
    OP16: 'deferred: queued by the owner (decisions 0115-0118); its archive phase is re-planned as pipeline adapters in chronicles-data (0120) before the slice starts',
    OP17: 'deferred: queued by the owner (decisions 0115-0118); its archive phase is re-planned as pipeline adapters in chronicles-data (0120) before the slice starts',
    OP18: 'deferred: queued by the owner (decisions 0115-0118); its archive phase is re-planned as pipeline adapters in chronicles-data (0120) before the slice starts',
    OP19: 'deferred: queued by the owner (decisions 0115-0118); its archive phase is re-planned as pipeline adapters in chronicles-data (0120) before the slice starts',
    OP20: 'deferred: queued by the owner (decisions 0115-0118); its archive phase is re-planned as pipeline adapters in chronicles-data (0120) before the slice starts',
  },
  // Remarkable and public: the archive's rule moves with the pipeline to chronicles-data; RP9 waits on its contract v2.
  'remarkable-and-public': {
    RP1: 'deferred: built and tested here, then the places pipeline moved to chronicles-data (decision 0108); the rule and its tests go there (specs/remarkable-and-public/handoff.md)',
    RP2: 'deferred: built and tested here, then the places pipeline moved to chronicles-data (decision 0108); the rule and its tests go there (specs/remarkable-and-public/handoff.md)',
    RP3: 'deferred: built and tested here, then the places pipeline moved to chronicles-data (decision 0108); the rule and its tests go there (specs/remarkable-and-public/handoff.md)',
    RP4: 'deferred: built and tested here, then the places pipeline moved to chronicles-data (decision 0108); the rule and its tests go there (specs/remarkable-and-public/handoff.md)',
    RP5: 'deferred: built and tested here, then the places pipeline moved to chronicles-data (decision 0108); the rule and its tests go there (specs/remarkable-and-public/handoff.md)',
    RP6: 'deferred: built and tested here, then the places pipeline moved to chronicles-data (decision 0108); the rule and its tests go there (specs/remarkable-and-public/handoff.md)',
    RP7: 'deferred: built and tested here, then the places pipeline moved to chronicles-data (decision 0108); the rule and its tests go there (specs/remarkable-and-public/handoff.md)',
    RP10: 'deferred: built and tested here, then the places pipeline moved to chronicles-data (decision 0108); the rule and its tests go there (specs/remarkable-and-public/handoff.md)',
    RP12: 'deferred: built and tested here, then the places pipeline moved to chronicles-data (decision 0108); the rule and its tests go there (specs/remarkable-and-public/handoff.md)',
  },
  // react-native-web always reports a screen reader, so the screen-reader path runs only on a device.
  'replay-rhythm': { RR17: 'device: both replays step through the moments with a screen reader on, native only' },
};

/**
 * Specs a slice is building (TG22): from its plan until done, its criteria are exempt from the gate.
 * `{ slug: { branch, since: 'YYYY-MM-DD' } }`; an entry older than 7 days fails the docs check.
 */
const IN_PROGRESS = {};

const byName = new Map(FEATURES.map((f) => [f.name, f]));

/** A glob (`**`, `*`, `{a,b}`) as a regular expression over posix paths. */
function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i];
    if (ch === '*' && glob[i + 1] === '*') {
      re += '.*';
      i++;
      if (glob[i + 1] === '/') i++;
    } else if (ch === '*') re += '[^/]*';
    else if (ch === '{') {
      const end = glob.indexOf('}', i);
      re += `(?:${glob.slice(i + 1, end).split(',').map((s) => s.replace(/[.+^$()|[\]\\]/g, '\\$&')).join('|')})`;
      i = end;
    } else re += /[.+^$()|[\]\\?]/.test(ch) ? `\\${ch}` : ch;
  }
  return new RegExp(`^${re}$`);
}

const compiled = FEATURES.map((f) => ({ f, res: f.source.map(globToRegExp) }));

/** The features a source file belongs to (repo-relative posix path); a test file's is its folder. */
function featuresOf(rel) {
  const m = /^src\/lib\/__tests__\/([^/]+)\/[^/]+$/.exec(rel);
  if (m) return byName.has(m[1]) ? [byName.get(m[1])] : [];
  return compiled.filter((c) => c.res.some((r) => r.test(rel))).map((c) => c.f);
}

/** The feature that owns a journey, or null. */
const featureOfJourney = (name) => FEATURES.find((f) => f.journeys.includes(name)) ?? null;

/** The features that list a spec slug. */
const featuresOfSpec = (slug) => FEATURES.filter((f) => f.specs.includes(slug));

module.exports = { FEATURES, RETIRED, UNTESTED, IN_PROGRESS, globToRegExp, featuresOf, featureOfJourney, featuresOfSpec, byName };
