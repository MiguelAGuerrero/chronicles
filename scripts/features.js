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
    source: ['src/lib/types.ts', 'src/lib/{store,useStore,meta,id,focus}.ts', 'src/lib/ports/**'],
    journeys: [],
    specs: ['functional-core', 'affected-checks', 'test-organization', 'shells-saved-settings', 'test-gaps'],
  },
  {
    name: 'storage',
    about: 'the db adapters, migrations and media paths',
    rule: 'storage',
    source: ['src/lib/db/**', 'src/lib/media/**'],
    journeys: [],
    specs: [],
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
    source: ['src/lib/nav/**', 'src/lib/here/**'],
    journeys: [],
    specs: ['v0.5-places', 'bridges-and-open-in-maps', 'quality-of-life'],
  },
  {
    name: 'replay',
    about: 'the five beats after a walk, the summary, the quiet lines',
    rule: 'replay',
    source: ['src/app/replay/**', 'src/lib/ceremony/**', 'src/components/ceremony/**', 'src/lib/{replay,quietLines,summary}.ts', 'src/components/CaptureView.tsx'],
    journeys: ['replay'],
    specs: ['concept', 'replay-rhythm'],
  },
  {
    name: 'moments',
    about: 'moments and days: the day screen, moment pins, the moment bar',
    rule: 'moments-and-days',
    source: ['src/lib/{days,useLocate,momentPins}.ts', 'src/lib/locate/**', 'src/app/day/**', 'src/components/MomentBar.tsx', 'src/lib/explore/momentFind/**'],
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
      'src/app/{_layout,explore}.tsx',
      'src/components/{StartSettings,HomeSheet,RecordingBar,SwitchRow,OpenWalk,Modal,ScreenError}.tsx',
      'src/lib/{launchRoute,launchWalk,recordingBar,walkNav,walkGate,openWalkLoad,startPlan,useStartWalk,useTabMap,memoGate,quietLines,summary,walkEvents,settleWithin,tabsHidden,captureBus}.ts',
    ],
    journeys: ['tabs', 'reload', 'launch'],
    specs: ['navigation-and-tabs'],
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
      'src/lib/db/{exploreRow,placeRow,stores}.ts',
      'src/app/(tabs)/index.tsx',
      'src/components/atlas/**',
      'src/components/{MarkPinView,ExploreSettings,ReminderCard,RemindEditor}.tsx',
    ],
    journeys: ['marks', 'atlas', 'grading', 'snap'],
    specs: ['v1-discovery', 'explore-atlas', 'pocket-alert-nudge', 'reminder-bell', 'atlas-grading', 'town-presence', 'discrete-navigation'],
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
    source: ['src/lib/areas/**', 'src/lib/{places,placeAll,backlog}.ts', 'src/components/{StarView,AreaPoint}.tsx'],
    journeys: ['outlines'],
    specs: ['v0.5-places', 'places-worth-the-stop', 'town-outlines', 'town-borders', 'town-presence'],
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
      'src/lib/{useCaptures,thumbPlan,thumbJob,useMediaUri,captureBus}.ts',
      'src/lib/here/**',
      'src/lib/audioMode*.ts',
      'src/lib/export/**',
      // Media editing (ME1-ME23): the editor, edited photos and videos, the Edit offer.
      'src/components/edit/**',
      'src/components/Baker*.ts',
      'src/lib/{mediaEdit,editSession,editOffer,captionInput}.ts',
      'src/lib/{captureEdits,videoEdit}/**',
    ],
    journeys: ['edit'],
    specs: ['memories-on-revisit', 'media-editing'],
  },
  {
    name: 'chronicle',
    about: 'the Chronicle tab: the walks list, months, rename, editing a note',
    rule: 'tabs-and-home',
    source: ['src/app/(tabs)/chronicle.tsx', 'src/lib/{rename,noteEdit,months,walkTitle}.ts', 'src/components/{NoteEditor,WalkActions}.tsx'],
    journeys: ['chronicle'],
    specs: ['quality-of-life'],
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
    specs: ['clearing-walks-and-moments'],
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
const RETIRED = {
  // As the spec says (its "Retired by this slice" line, Explore, v1 slice 5, Nov 1): S1-S6, S9-S12, S14, S15,
  // S22 and S23 of the scan, and all of slice 3's ambient hints (A1-A11). S7, S8, S13, S16 and S17 are live.
  'v1-discovery': ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S9', 'S10', 'S11', 'S12', 'S14', 'S15', 'S22', 'S23', ...Array.from({ length: 11 }, (_, i) => `A${i + 1}`)],
  // Retired by Explore (docs/STATUS.md).
  'v1.5-landing': ['L10', 'L13', 'L16'],
  // No Open in Maps on "Off your route" (decision 0059).
  'bridges-and-open-in-maps': ['NH4'],
};

/**
 * Live criteria that no test names, on purpose (TG20): `device: <why>` for a check only a phone can
 * make (the web build can't reach it), `deferred: <why>` for the owner's call to wait. Keyed by spec.
 */
const UNTESTED = {
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
