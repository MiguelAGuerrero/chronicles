---
paths:
  - "src/lib/ceremony/{stack,pictures,room,grid,rhythm,types,live,said}.ts"
  - "src/components/ceremony/{Stack,Pictures,Still,Cards,Grid,Stage,Whispers,overlays,layout}.{ts,tsx}"
  - "src/lib/__tests__/replay/{stack,pictures,moment,restraint,ui}.test.ts"
  - "scripts/e2e/journeys/{replay,stacks}.js"
---
# Replay ceremony: what stays behind, and a moment on screen

The last part of the replay's rework (`specs/replay-ceremony`, RC28-RC37, RC45-RC48, decision 0206): the pictures left
standing on the map, the stack at the edge, the scrim under a card, a photo's drift, and a moment of several pieces
arriving whole. The engine, the camera, the breaks and the opening and close are in `replay-ceremony.md`; the five
beats and the rhythm's timings in `replay.md`. Captions (RC38-RC44) wait for the first phone build.

## What stays behind (RC28-RC34)

- **A card shrinks onto its own place** (`layout.ts` `cardPose`: to `PICTURE.size`, `PICTURE.lift` over the place), and
  from its last frame its picture stands there: a `picture` overlay, drawn by the stage (`Pictures.tsx`), placed every
  frame by `useLiveStyle` from the frame's camera (`picturePose`). **The map's pins are not touched** (0154): a moment
  that stands as its picture is left out of `Frame.pins` until the telling is done, so its pin comes with the card. A
  note at the same stop keeps its pin, under the picture.
- **A standing picture is a control** (`replay-ceremony ui 1`, the UI review's U1): a tap opens its moment in the
  viewer (`ctx.open([o.capture])`, the stack's way in, so the replay holds until it closes), through one `Pressable`
  of `PICTURE.hit` (44 pt) around the tile, named "Open this moment". Whether it takes the tap is one flag from the
  frame (`layout.ts` `pictureTaps`, written on the control by `useLiveStyle` as `pointerEvents`, never a render: `replay-ceremony ui 15`): not one under a later picture (the one showing does), not
  one a card lies over. **Trap:** a card lets taps through to the stage (hold), so without that a tap on a card would
  open a picture nobody can see under it. The picture's root is `box-none` and its drawing `none`: only the control
  takes a tap, and one it does not take falls to what lies under it. "Under a card" is its tile meeting the card's
  box, so one just clear of a card's edge still opens.
- **The overlap rule is core** (`lib/ceremony/pictures.ts` `standing`): read from the latest back, a picture stands
  unless a later one that stands is within `PICTURE.apart` px, and the one over it gets a layered edge (so does a
  moment of several pieces). It depends on the zoom alone, never the centre: `rhythmFrame` asks again only when the
  zoom changes or another lands (`plan.memo`, keyed by both, so a frame is still a function of its time). One pass
  over a grid of cells: every frame of a rise or a pull-back asks. **Picture overlays come first in a frame, in
  landing order**: a leaf reads its own by index (`Pictures.tsx` `now`), never by a scan a picture.
- **With reduce motion the map is not the camera's**: `Frame.still` says where it stands (the view the telling opened
  on), and pictures and the last view's names are placed by it. With neither, a picture is not drawn.
- **The stack** (`lib/ceremony/stack.ts`, `Stack.tsx`): one entry for each moment with a picture or a video (a moment of
  several: one entry, a second edge; a video: its still under a play mark), `stackLand` after its card lands. `stackBound`
  is the screen's: from `STAGE_BOTTOM` up to 12 px under Next's foot (`STACK.top`, ui 2), `STACK.pitch` apart; on
  Android a finger gets 48 dp of it (`stackSlop`, a `hitSlop`: the drawing stays 44). One past the bound takes
  the top place while the rest step down and the oldest sinks away (`stackSlots`). `StackOverlay.captures` is every
  moment so far, dropped ones too: what the one control opens, the latest first. **It never shows a number**: no text
  in `Stack.tsx`, no count in the overlay; its height is the one exception to "nothing counts" (the owner's call).
- **Trap: the stack's entries are rendered, their motion is written.** Which entries exist is the stage's shape
  (`shapeOf`: how many are held, the newest, the lowest on screen and how many are on screen), so the stage renders
  when one lands or has dropped off; where each stands is `stackPose`, by `useLiveStyle`. At rest (`stackRest` after
  the last landing) the frame hands back the same overlay.
- **A card never reaches the stack** (`room.ts` `cardWidth`: the screen less the stack's room each side), which
  narrows a card a little under 341 px wide. The bubbles' corner and the line under the clock end short of it, and
  so do a whisper and the last view's names while the stack is up (`room.ts` `stackEdge`, `live.ts` `stackUp`, the
  poses' `stack` argument; ui 3): at 320 px a name's room is 254 px, not 304.
- **The last view's names are placed by the core** (ui 14, the owner's defaults, Nov 20; `said.ts` `lastNames`, once
  per telling, against the view it ends on). One or two places are each named beside their own place where every
  name stands clear of the walk's line, of the pictures standing on it and of the other name: under the lower of the
  place and the line where the walker passed it (`PassedOverlay.by`), the more northern of two over it (`above`),
  then the other ways round. Where they cannot (a narrow screen, pictures all along the walk, two places close
  together), and for more than two (RP19), they are the card's one line, beside no place (`at` null): under the walk
  where the screen has the room (`top`), else over it and its pictures, else under the top row as before.
  **A name's box is an estimate** (8.2 px a letter: no text is measured in the core), kept a little wide. The view
  (`Whispers.tsx`) only draws what the overlay says.
- **A whisper has a ground and a side** (ui 5, the review's U6): its words on the glass the last view's name has,
  lighter (13 px italic at 500), in a room (`layout.ts` `WHISPER`) centred on its place, `gap` under the lower of the
  place and the line where the walker passes it (`WhisperOverlay.by`). **Under is the rule, whichever side of the
  line the place is on**: pins and pictures stand upward from the line, and a whisper over its place covered the
  picture beside it (the journey's first picture of this fix). Only where the way runs down the screen is it over
  them (`above`, the plan's, said once): behind the walker, who would walk on into it. It is kept on the screen from
  100 px under the top down to the map's own marks at the foot (`STAGE_BOTTOM`), no higher: on a 320 by 568 phone the
  line stands at y 416 while the camera comes back from a card's pin, and a floor 120 px up put a whisper that
  arrives as a card leaves (RY22) on the walker for a third of a second (the `replay` journey, once it caught the
  whisper in the frame it first shows).
- **Where the way runs up or down the screen a whisper stands beside the line** (ui 13, the owner's defaults, Nov 20;
  `lib/ceremony/said.ts` `whisperBeside`, `WhisperOverlay.beside`): more north or south than twice east or west as
  the place is passed, its room is at the line's left (the stack is at the right), from the screen's edge to
  `WHISPER.side` (24 px: a picture's half tile and 6) short of the line and the place, level with the place, its
  words at the room's right edge and wrapping as they must. The width is said once, by where the camera has the line
  as the whisper arrives; under `WHISPER.min` (120 px) of room it keeps the place above. **Trap: 320 px has 128 px
  there at the most** (the walker is in the middle), so a place more than a few metres left of the line gets no side.
  While it is up it is kept on the screen first: if the camera then moves the line left, its box stays 8 px in and
  nears the line.
- **One whisper at a time** (ui 12; `said.ts` `whisperGroups`, asked by the plan): places whose whispers would be up
  together (the second arriving within `whisper` ms of the first) are said as one line (`passedLine` of them all),
  once, where and when the walker reaches the last of them, as a walk's more than two already are (RP19). No whisper
  is cut short and two never overprint. **Trap: the replay crosses ground fast**, so two places a hundred metres
  apart arrive well under a second apart. Replacing the older by the newer (the first try, Nov 20) left the first a
  flicker and the two overprinting for the fade's time.
- **Small pictures are `Still`** (a photo's small copy, a video's still, a video's tile in `COLORS.video`): never a
  player, and it asks for no still (VS2). `Pile.tsx` is gone; `videothumbs` and `palette` read the stack.

## A moment on screen (RC35-RC37)

- **The scrim is `Frame.scrim`**, a fifth at the most, one span for a stop's cards (`plan.scrims`): down as the first
  comes, up as the last shrinks away; a step with reduce motion. The stage lays it over the map *and the pictures*
  (`UNDER_SCRIM`), under everything else. `Frame.dim` stays gone and the word stays out of the stage (RC17's scan):
  a break never dims. The `replay` journey's veil detector steps over `replay-scrim` and reads it apart.
- **A photo's drift** is `CardOverlay.drift`, written as a scale on the picture alone (`card-photo`); 0 for a video, a
  grid, and with reduce motion. `scrim` and `drift` are one token each; 0 turns either off.
- **A moment of several pieces arrives whole** (`rhythm.ts` `stopSlots`). No video: two or more photos are one grid,
  memos and notes beside it on their own clock (MS17, as before); fewer play piece by piece. With a video: one card,
  its photos as the grid (one photo: a grid of one; its cells fill one picture's room), then each video in turn
  (`Slot.videos`, `CardOverlay.turn`), its notes beside from the start and **its memos after the videos, the card
  still up** (`Slot.offset`), so a memo never sounds over a video. `gridShown` is the pictures' time; no video is in
  a cell and `Grid.tsx` makes no player. A last row with fewer pieces than columns is shared out between them
  (`grid.ts` `rowShare`: a grid of three shows no empty cell), and the strip under a grid says "Photos"
  (`quietLines` `gridLabel`: a word, never a count; ui 4).
- **A video in its turn is its own `CardVideo`**, keyed by its piece and mounted when `turn` reaches it
  (`Turns`, `TurnVideo`): its file is resolved and its player made then, never one a piece. It reads its own turn's
  `playing` and `progress` (`mine`), and its media wait has its own key; the card's caption strip names what is up
  (the video's caption or "Video" in its turn). In Safari each is a new tag: each shows "Tap for sound" until tapped.
- **Trap: an edited video's view changes when its size is known** (`VideoPicture` for `VideoView`, ME4). Told to play
  before that, the tag it was playing in is taken away mid-start: a logged AbortError and a muted retry. `CardVideo`
  waits for the size, `SIZE_WAIT_MS` at the most; a video in its turn comes up only `turn` ms before it plays, so
  this bit at once (the `stacks` journey's trimmed video).

## Tests

`stack.test.ts`, `pictures.test.ts`, `moment.test.ts`, `restraint.test.ts` (with `walks.ts`: the walks and the guarded
reaches), and `ui.test.ts` (the UI review's fixes, `replay-ceremony ui 1-8`, the owner's defaults of Nov 20, `ui 9-14`,
and `ui 15`; the journeys tap a standing picture open, picture a whisper and a name beside a stack at its bound, and
watch a fourth walk north past two places, `seedNorthWalk`, for a whisper beside the line and one at a time). The `replay` journey reads the stack, the pictures, the scrim and the drift from the frames it records
(`staysOf`), and a third walk of eighteen photos (`seedPhotoWalk`) fills the stack past a 320 px phone's bound; the
`stacks` journey watches a moment's grid and then its videos in turn.
