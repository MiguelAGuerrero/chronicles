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
    specs: ['functional-core', 'affected-checks', 'test-organization', 'shells-saved-settings', 'test-gaps', 'device-acceptance', 'vision-gate', 'react-compiler', 'area-states'],
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
    name: 'backup',
    about: 'Your data: the whole-app backup zip, its versioned format and its reader (decision 0241)',
    rule: 'backup',
    source: ['src/lib/backup/**', 'src/app/your-data.tsx', 'src/components/PageRow.tsx'],
    journeys: ['backup'],
    specs: ['back-up-everything', 'backup-zip64'],
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
    source: ['src/lib/gaps/**', 'src/lib/tileCollector/**', 'src/components/{GapCard,GapDraw,KeepGapsCard}.tsx'],
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
    specs: ['concept', 'replay-rhythm', 'replay-pace', 'replay-ceremony'],
  },
  {
    name: 'moments',
    about: 'moments and days: the day screen, moment pins, the moment bar',
    rule: 'moments-and-days',
    source: ['src/lib/{days,useLocate,momentPins,moment}.ts', 'src/lib/locate/**', 'src/app/day/**', 'src/components/MomentBar.tsx'],
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
    journeys: ['tabs', 'reload', 'launch', 'capturehome', 'barcaptures'],
    specs: ['navigation-and-tabs', 'capture-from-chronicle', 'recording-bar-captures'],
  },
  {
    name: 'presence',
    about: 'what a place is: one vocabulary of classes from every source\'s tags, read by density, marks and bars (decision 0140)',
    rule: 'presence',
    source: ['src/lib/presence/**'],
    // Its consumers own the journeys that show it: explore's marks, atlas and grading.
    journeys: [],
    specs: ['presence', 'presence-readers'],
  },
  {
    name: 'complexes',
    about: 'complexes: named, bounded places made of other places (a mall, a market, a campus, a station), on Explore and in a moment\'s place line',
    rule: 'complexes',
    source: ['src/lib/complexes/**', 'src/components/ComplexLabel.tsx'],
    journeys: ['complexes'],
    specs: ['complexes'],
  },
  {
    name: 'explore',
    about: 'the Explore tab (the atlas), discovery, marks, reminders',
    rule: 'explore-atlas',
    source: [
      'src/lib/discovery/**',
      'src/lib/explore/**',
      'src/lib/atlas/**',
      'src/lib/useReminded.ts',
      'src/lib/db/{exploreRow,placeRow,stores}.ts', 'src/lib/markNames.ts',
      'src/app/(tabs)/explore.tsx',
      'src/components/atlas/**',
      'src/lib/gazetteer/**',
      'src/components/{MarkPinView,ExploreSettings,ReminderCard,RemindEditor,OpenInMapsButton,IntoPage,IntoRow,PageRow}.tsx',
      'src/app/into.tsx', 'src/lib/intoNav.ts', 'src/lib/intoGate.ts', 'src/lib/walkName.ts',
    ],
    journeys: ['marks', 'atlas', 'grading', 'snap', 'carousel', 'curiosities', 'freelook', 'small-places', 'placesearch', 'subtypes', 'openmaps', 'openmaps-chronicle', 'into', 'placeoffer', 'hidekind'],
    specs: ['v1-discovery', 'explore-atlas', 'pocket-alert-nudge', 'reminder-bell', 'atlas-grading', 'town-presence', 'discrete-navigation', 'explore-carousel', 'places-worth-the-stop', 'places-pipeline', 'remarkable-and-public', 'places-out-of-town', 'presence-and-kinds', 'whole-towns', 'community-parks', 'free-look', 'small-places', 'place-search', 'explore-go-here', 'go-here-everywhere', 'explore-subtypes', 'more-attractions', 'open-in-maps-here', 'what-im-into-page', 'sights-and-local-life', 'tap-to-capture-places', 'capture-at-a-place', 'places-layer', 'modes-to-layers', 'town-identity', 'moment-assignment-fallback', 'poi-hide-from-card'],
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
    name: 'roads',
    about: 'the road engine: main roads from the map\'s z12 tiles, a directed graph, one way between towns with a cost by kind of road; drawn on the outing page with distances by road',
    rule: 'roads',
    source: ['src/lib/roads/**'],
    // The road on the page is checked by the outing feature's `journey` (a journey belongs to one feature, TG1).
    journeys: [],
    specs: ['road-engine'],
  },
  {
    name: 'outing',
    about: 'plan an outing: describe what you want to see from a vocabulary, get one proposed circuit over candidates with facets; stops named on a tap or on arrival',
    rule: 'outing',
    source: ['src/lib/outing/**', 'src/components/outing/**'],
    journeys: ['outing', 'journey', 'startfar'],
    specs: ['quick-circuit', 'outing-journey', 'drive-in-the-outing', 'shop-facets'],
  },
  {
    name: 'fixtures',
    about: 'a town\'s fixtures: chronicles-data\'s third pack (a tourist office, a town hall, a library, a square, a station...), read by tile through its adapter; a stop, never a find (decisions 0225, 0255, 0268)',
    rule: 'town-fixtures',
    source: ['src/lib/fixtures/**'],
    journeys: [],
    specs: ['town-fixtures'],
  },
  {
    name: 'layers',
    about: 'map layers: the Layers button and panel, what is on, storefronts and town borders as layers',
    rule: 'layers',
    source: ['src/lib/layers/**', 'src/lib/pastLines/**', 'src/components/LayersControl.tsx'],
    journeys: ['layers', 'dense', 'switches', 'where'],
    specs: ['map-layers', 'explore-dense-city', 'smooth-switches', 'storefronts', 'where-ive-been'],
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
    about: 'what\'s good here: landing analysis, storefront streets, activity density',
    rule: 'landing',
    source: ['src/lib/landing/**', 'src/lib/activity/**'],
    journeys: [],
    specs: ['v1.5-landing', 'activity-density'],
  },
  {
    name: 'places',
    about: 'places and areas: boundaries, assignment, the walk\'s title',
    rule: 'places-and-areas',
    source: ['src/lib/areas/**', 'src/lib/{places,placeAll}.ts', 'src/lib/backlog/**', 'src/components/{StarView,AreaPoint}.tsx'],
    journeys: ['outlines'],
    specs: ['v0.5-places', 'town-outlines', 'town-borders', 'town-presence', 'neighborhood-boundaries'],
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
    journeys: ['qol', 'palette'],
    specs: ['quality-of-life', 'compass', 'native-map-frames', 'map-palette'],
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
      // Stack with previous (SW1-SW18, decision 0197): the join, its Undo window and the quick-action row's rule.
      'src/lib/join/**',
      'src/components/journal/{QuickActions,StackGrid}.tsx',
      // Moment stacks (MS1-MS21): the open moment's store, the pill and the stacked mark.
      'src/lib/momentPill/**',
      'src/components/StackMark.tsx',
      'src/lib/here/**',
      'src/lib/audioMode*.ts',
      'src/lib/export/**',
      // Media editing (ME1-ME23): the editor, edited photos and videos, the Edit offer.
      'src/components/edit/**',
      'src/components/Baker*.ts',
      'src/lib/{mediaEdit,editSession,editOffer,captionInput,voiceTrim}.ts',
      'src/lib/{captureEdits,videoEdit}/**',
      // Video thumbnails (VS1-VS9): every preview's small copies and stills, and the play mark.
      'src/lib/thumbs/**',
      'src/components/VideoMark.tsx',
      // Unsaved captures (UN1-UN15, decision 0196): the one holder of every capture that failed to save.
      'src/lib/unsaved/**',
      // Pictures through expo-image (EI1-EI6): the one wrapper every picture on screen goes through.
      'src/components/Picture.tsx',
    ],
    journeys: ['edit', 'stacks', 'stackjoin', 'voicetrim', 'videothumbs', 'unsaved'],
    specs: ['memories-on-revisit', 'media-editing', 'moment-stacks', 'stack-with-previous', 'voice-trim', 'note-types', 'video-thumbnails', 'unsaved-captures', 'expo-image'],
  },
  {
    name: 'chronicle',
    about: 'the Chronicle tab: the walks list, months, rename, editing a note',
    rule: 'tabs-and-home',
    source: ['src/app/(tabs)/index.tsx', 'src/lib/{rename,months,walkTitle}.ts', 'src/components/WalkActions.tsx'],
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
    name: 'transcript',
    about: 'a voice memo\'s words, read on the phone in the background and shown as a caption under the memo (memo transcripts, decision 0169)',
    rule: 'memo-transcripts',
    source: ['src/lib/transcript/**', 'src/lib/useTranscript.ts', 'src/components/MemoTranscript.tsx'],
    journeys: ['transcript'],
    specs: ['memo-transcripts'],
  },
  {
    name: 'reactions',
    about: 'reactions on any moment, one per family (Feeling, Taste, Thought): the sign, the panel, marks, pin bubbles and the lenses (decision 0176)',
    rule: 'reactions',
    source: ['src/lib/reactions/**', 'src/components/reactions/**', 'src/lib/pins.ts'],
    journeys: ['reactions'],
    specs: ['reactions', 'reaction-links'],
  },
  {
    name: 'journal',
    about: "Chronicle's Memories as a journal: one sheet in book order, ending in an open line where writing is the capture (decision 0155)",
    rule: 'journal',
    source: ['src/lib/journal/**', 'src/components/journal/**'],
    journeys: ['journal'],
    specs: ['chronicle-journal'],
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
    journeys: ['threads', 'responses', 'capthread'],
    specs: ['owner-threads', 'moment-references', 'response-thread', 'thread-at-capture'],
  },
  {
    name: 'notes',
    about: 'note pages: a note is a journal entry, written in TipTap (Expo DOM), kept as it is written, read in the viewer; its body is Markdown once the page wrote it',
    rule: 'note-pages',
    source: ['src/lib/notePage/**', 'src/components/notePage/**', 'src/lib/noteEdit.ts'],
    journeys: ['notepage'],
    specs: ['note-pages', 'note-pictures'],
  },
  {
    name: 'motion',
    about: 'motion polish: timings, presses, entrances, haptics, the pocket alert',
    rule: 'motion-polish',
    source: ['src/lib/{motionTokens,motion,enter,zoomOut,haptics,canBuzz,canBuzz.web}.ts', 'src/components/{Enter,HomeSheet,ui}.tsx'],
    journeys: ['nudge', 'modes'],
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
    source: ['src/lib/deletion/**', 'src/lib/emptyWalk/**', 'src/components/{WalkActions,UndoToast}.tsx'],
    journeys: ['deletion'],
    specs: ['clearing-walks-and-moments', 'ui-conformance', 'empty-walk'],
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
  // Arming by "Capture here" went with the place's card carrying Camera, Voice and Note (the owner, Nov 20, specs/capture-at-a-place
  // CA1-CA12): a capture begun on the card carries the place itself.
  'tap-to-capture-places': ['TC3', 'TC4'],
  // Captions in the replay wait for the first phone build (the owner, Nov 18, decision 0206): they cannot be seen on the web.
  'replay-ceremony': ['RC38', 'RC39', 'RC40', 'RC41', 'RC42', 'RC43', 'RC44'],
  // The soft cap of about 60 s and its floors went when each moment was given its own time (the owner, Nov 18, decision 0203):
  // specs/replay-pace RY10 holds that nothing shrinks to fit a total.
  'replay-rhythm': ['RR5'],
  // The Loop / One way switch went with the page rebuilt as a map (outing-journey, decision 0210, a default taken on the owner's "proceed
  // with reasonable defaults", theirs to overrule): a journey is a loop when one can be made, else one way, and says which (OJ7).
  'quick-circuit': ['QC3'],
  // Go here and its sheet were replaced by two outcome-named controls, Walk and "Open in Maps" (the owner, Nov 17, decision 0195):
  // specs/open-in-maps-here (OM1-OM14) carries what stands of them.
  'explore-go-here': Array.from({ length: 15 }, (_, i) => `GH${i + 1}`),
  'go-here-everywhere': Array.from({ length: 13 }, (_, i) => `GE${i + 1}`),
  // A no-regression promise that could never fail first (the owner, Nov 17, at the deploy): NF8 took its place.
  'native-map-frames': ['NF6'],
  // The row under the line (decision 0175) was replaced by a toolbar at the foot the same day (decision 0178, the owner).
  // The composer (decision 0179) retired writing on the page: JN28-JN30, JN32, JN33, and the toolbar's pen (JN42).
  'chronicle-journal': ['JN28', 'JN29', 'JN30', 'JN32', 'JN33', 'JN34', 'JN35', 'JN36', 'JN37', 'JN38', 'JN39', 'JN40', 'JN42'],
  // Note types became reactions on any moment (the owner, Nov 14, decision 0176): one per family, their own records,
  // the head always the kind, Type now Reaction. specs/reactions (RX1-RX36) carries what stands of them.
  'note-types': Array.from({ length: 27 }, (_, i) => `NY${i + 1}`),
  // A moment no longer finds a place by itself (the owner, Nov 12, decision 0224): only a tap on the place does (TC1-TC4).
  'shells-saved-settings': ['SH4'],
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
  // E1 (a walk starts quiet; Explore is a switch): the Explore mode went (the owner, Nov 19, decision 0234); specs/modes-to-layers carries what stands.
  'v1-discovery': [...V1_SCAN_AND_AMBIENT, 'E14', 'E1'],
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
  // NV26 (the options card keeps the Explore switch): the same decision, 0234.
  'navigation-and-tabs': ['NV14', 'NV26'],
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
  // Memories became a journal (the owner, Nov 12, decision 0155): the capture band gave way to the open line, so the
  // band's button names (HC8), its memo slots (HC11), its restraint (HC12) and its empty state (HC13) are the journal's
  // JN10, JN14 and JN2 now, checked by the `journal` journey.
  'capture-from-chronicle': ['HC8', 'HC11', 'HC12', 'HC13'],
  // DN5 (Nov 4): a swipe back lands back by itself, so there is no trail. DN3, DN4, DN6-DN9 (Nov 10, decision 0124): the
  // grid and the directional swipe gave way to a row of cards that a swipe steps; the new criteria are the explore-carousel spec's.
  'discrete-navigation': ['DN3', 'DN4', 'DN5', 'DN6', 'DN7', 'DN8', 'DN9'],
};

/**
 * Live criteria that no test names, on purpose (TG20): `device: <why>` for a check only a phone can
 * make (the web build can't reach it), `deferred: <why>` for the owner's call to wait. Keyed by spec.
 */
const UNTESTED = {
  // Outing journey (decisions 0210-0210): criteria with no test of their own, each with where it is held instead. Recorded as the slice
  // leaves IN_PROGRESS to ship (the owner's /deploy, Nov 18).
  'outing-journey': {
    D6: 'deferred: a decision, not a criterion: the capture stack is unchanged while driving, held by OJ33, OJ39 and RE27\'s checks in the journey `journey`',
    OJ4: 'deferred: held in parts by other ids: the card\'s words by OJ21 and RE17, the map\'s line by RE1 and RE16 (the journey `journey`); the finding criterion is the ux-reviewer\'s cold find (Nov 18, in specs/road-engine\'s Audit)',
    OJ6: 'deferred: by construction: the page hosts Explore\'s own search component (GZ9-GZ13 hold that nothing of a query is stored or sent); the journeys `outing` and `journey` pick a destination through it',
    OJ8: 'deferred: not built: the towns near you as shortcuts (docs/DEFERRED.md, outing journey step 1)',
    OJ10: 'deferred: no journey opens the page with no position; the line is the one QC30 tests in words, and the hook proposes nothing without an origin',
    OJ16: 'deferred: held by QC41\'s tests (the switch, off by default, kept) and the journey `outing`, which toggles `outing-chains`',
    OJ32: 'deferred: unchanged from QC19 and QC26, whose tests hold the chip; no journey of this slice walks to a stop',
    OJ51: 'deferred: superseded in part by RE1 (the road in place of the straight line); the straight line that remains is checked by the journey `journey` as the count of points handed to the map',
  },
  // The road engine (decisions 0215-0214).
  'road-engine': {
    D6: 'deferred: a decision; held by RE26\'s checks (the one-time statement at the tap, and with the journey\'s towns on the page)',
    RE14: 'deferred: not built: towns are still chosen by the straight line (docs/DEFERRED.md, the road engine step 2)',
    RE24: 'deferred: the end at the town is the plan\'s own rule (OJ49\'s tests: within reach the town is at hand) dropping the `driving` flag; no journey drives nine kilometres to a town',
    RE31: 'deferred: by construction: the bar exists only inside an open session\'s screen, and Drive there starts none',
    RE33: 'device: speech and guiding with the phone locked or the app behind another; not met today (docs/DEFERRED.md, the road engine step 4)',
  },
  // Pictures through expo-image: the cache and the recycling are a phone's to see under memory pressure.
  'expo-image': { EI6: 'device: memory and recycling over a few hundred photos on a phone; the web build has no native image cache' },
  // Plan an outing (decision 0196): criteria with no test of their own, each with where it is held instead.
  'quick-circuit': {
    QC32: 'deferred: a review criterion, the ux-reviewer\'s cold find (Nov 17, in the spec\'s Record), not a unit test',
    QC34: 'deferred: by construction: `HOURS_LINE` is one constant the page renders once under the slots, and no pack field holds hours; the journey `outing` checks the line (QC20)',
    QC35: 'deferred: by construction: the page computes from the picks alone, and QC7\'s test plans with a second entry that wins no stop and says nothing of it',
    QC36: 'deferred: Start is disabled with nothing to start; the reason is the line QC2 and QC30 test (nothing picked, no position); no test of its own for the disabled state',
  },
  // Native map frames: the source scans hold the shape; the frame rate is a profiler's on a phone.
  'native-map-frames': { NF7: 'device: React DevTools on a development build during a walk; npm test cannot render MapLibre RN' },
  // Free look: the out-of-town stars (decision 0115) are queued, not built; FL19 is the call their slice carries.
  'free-look': { FL17: 'deferred: a launch fix that arrives late cannot be staged in the harness; the guard is the screen\'s `lookedRef` and `freeRef` in the fix handler, read by code review', FL19: 'deferred: the out-of-town stars of decision 0115 are not built yet; 0150 records that they follow the look, and that slice carries it' },
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
  // The replay on the web refuses sound without a tap, so a trimmed memo's advance past its end handle is tried on a phone.
  'voice-trim': { VT7: 'device: a replay moves on at a trimmed memo\'s end handle, tried on a phone (the logic is VT8, the one path VT12)' },
  'replay-rhythm': { RR17: 'device: both replays step through the moments with a screen reader on, native only' },
  'replay-pace': { RY20: 'device: the screen reader\'s steps are unchanged and show no Next, native only (react-native-web never takes that path)' },
  // The map's palette on a phone: the native layers and pin views take the same constants, never run on a device.
  'map-palette': { MP13: 'device: the native map\'s layers and pin views in Earth and ink, seen on a phone (docs/NATIVE_UNVERIFIED.md)' },
};

/**
 * Specs a slice is building (TG22): from its plan until done, its criteria are exempt from the gate.
 * `{ slug: { branch, since: 'YYYY-MM-DD' } }`; an entry older than 7 days fails the docs check.
 */
/**
 * A spec whose criterion prefix was renamed after its tests were written, because another spec held the prefix first
 * (check:docs, TG14): new prefix to old, so check:test-first reads the history under both. Never for any other reason.
 */
const RENAMED = {
  // Video thumbnails were built as VT1-VT9 beside voice trim's VT1-VT12 on main; renamed on the merge (Nov 13).
  'video-thumbnails': { VS: 'VT' },
  // The React Compiler was built as RC1-RC3 beside the replay ceremony's RC1-RC48 on main; renamed on the merge (Nov 18).
  'react-compiler': { CM: 'RC' },
};

const IN_PROGRESS = {
  'drive-in-the-outing': { branch: 'claude/determined-wright-yg1fq9', since: '2026-11-26' },
  'shop-facets': { branch: 'claude/determined-wright-yg1fq9', since: '2026-11-26' },
  'town-fixtures': { branch: 'claude/determined-wright-yg1fq9', since: '2026-11-26' },
};

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

module.exports = { FEATURES, RETIRED, UNTESTED, RENAMED, IN_PROGRESS, globToRegExp, featuresOf, featureOfJourney, featuresOfSpec, byName };
