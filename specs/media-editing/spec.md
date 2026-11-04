<!-- Repo first: written from the owner's request in a session (Nov 4), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Media editing: crop, rotate, filters, drawing, text and trim on moments

Nov 4, 2026 · @Miguel Guerrero

A photo can carry a caption today; nothing else can be changed, and a video can't even carry that. This slice gives photo and video moments the basic edits any photo app has: crop and rotate, a few fixed filters, a pen for circling what mattered, text, and a trim for videos. Everything shown on the moment is in what is saved out.

## How it fits (from the investigation, Nov 4)

- Captions are already data, baked only when saved out (decision 0012). Edits follow the same rule: the photo or video file is the truth and is never changed; the edits are stored with the moment and drawn over it.
- expo-image-manipulator (installed) crops and rotates on phones and the web; it has no colour filters.
- react-native-svg 15.16 (installed) has `FeColorMatrix` on iOS, Android and the web: one 4×5 colour matrix covers black and white, contrast and saturation. It can't filter a playing video.
- React Native's own CSS `filter` (grayscale, contrast, saturate) is behind an experimental flag that is off on iOS, so it isn't used.
- No Expo module re-encodes a video. Saving an edited video needs native code: a local Expo module in the repo (Swift on AVFoundation, Kotlin on Media3 Transformer). The web re-records through a canvas.

## Decisions (the owner's calls, Nov 4)

- Stay in React Native: react-native-svg and expo-image-manipulator, no Skia.
- Saving out includes everything styled on the moment, videos too: a local Expo module in Swift and Kotlin for phones, canvas and MediaRecorder on the web.
- Fixed filter presets, no sliders. The set is the one people expect from their phone's photo app, so editing after the fact feels familiar: Original, Vivid, Warm, Cool, Dramatic, Fade, Mono, Noir, Sepia, under plain names (no app's own names). Each has to be a single colour matrix, so the set has no vignette, grain or tone curves. (The owner's first examples were black and white, high contrast and vivid; they asked for a better default set, Nov 4.)
- Edits are data on top of the untouched original, and saving out renders them in one file (confirmed Nov 4).
- Previews (the small copy on pins and the memory preview) show the edits but not the caption (confirmed Nov 4).
- Scope: text, filters, crop, rotate, video trim, and drawing modelled on the iPhone's Markup: Pen, Marker and Eraser, three thicknesses, Markup's basic swatches, Undo and Redo (the owner, Nov 4: "mimic iPhone pen"). No pencil texture, opacity slider, colour wheel, lasso, ruler or shapes. No stickers, text styles or flip.
- Videos get everything but filters, so a video looks the same on iPhone, Android and the web.
- Editing happens from the viewer, and from an Edit pill shown right after every photo or video on the three places that take them (the walk screen, Navigate's ready screen, the minimized walk's recording bar). Taking a photo stays one tap: the pill is offered, the editor never opens by itself. (First call "viewer only", changed the same day.)
- One Edit screen with a row of tools replaces the caption button.

## Criteria

The editor

1. **ME1** Wherever the viewer offers a caption today (the walk screen, Navigate's ready screen, Chronicle, the replay), photos and videos show an Edit button instead (`testID` `viewer-edit`, label "Edit"). It opens one editor inside the viewer, never as a second Modal. The tool row holds Crop, Filter, Draw and Text for a photo; Crop, Draw, Text and Trim for a video.
2. **ME2** Nothing is saved until Done, and Done saves every change at once. Close with changes asks "Discard these edits?" (Keep editing, Discard). Close with none closes at once. Done with no change writes nothing.
3. **ME3** The file is never changed. The editor opens on the moment's current edits, and Revert to original in the editor clears them all (crop, rotate, filter, drawing, text, trim) once Done is pressed.
4. **ME4** A moment shows its edits wherever it shows full screen: the viewer, the replay's stops and the day replay's stops.

Crop and rotate

5. **ME5** Rotate turns the picture 90° clockwise per tap; four taps bring it back.
6. **ME6** Crop shows a frame over the picture, moved by dragging inside it and resized by its corner handles, with aspect choices Free, Square, 4:5 and 16:9, and Reset to the whole picture. The frame never leaves the picture and is never smaller than a tenth of either side.
7. **ME7** `editedSize`, `clampCrop` and `aspectCrop` in `lib/mediaEdit.ts` are pure and unit-tested. The crop is kept in the original picture's coordinates, so rotating after cropping keeps the same part of the picture.

Filters (photos)

8. **ME8** Filter shows the presets Original, Vivid, Warm, Cool, Dramatic, Fade, Mono, Noir and Sepia in one scrolling row, each as a small preview of the photo itself with its name under it. A tap applies one at once; Original removes it. The chosen one is marked and announced as selected.
9. **ME9** Each preset is a 4×5 colour matrix in `lib/mediaEdit.ts`, and `applyMatrix(pixel, matrix)` is pure and unit-tested, results clamped to 0-255:
   - Original is the identity;
   - Vivid moves a colour away from its grey and leaves a grey pixel grey;
   - Warm turns a mid-grey pixel red above blue; Cool, blue above red;
   - Dramatic moves values away from mid-grey and lowers saturation;
   - Fade lifts black above 0, brings white below 255 and lowers saturation;
   - Mono gives equal red, green and blue; Noir does too, further from mid-grey than Mono;
   - Sepia turns a mid-grey pixel red above green above blue.

Drawing

10. **ME10** Draw works like the iPhone's Markup. Its tools are Pen, Marker and Eraser:
    - **Pen**: an opaque line with round ends;
    - **Marker**: a wide, see-through highlighter line with flat ends;
    - **Eraser**: removes a whole line it touches, as Markup's object eraser does.
    
    Tapping the selected Pen or Marker again offers three thicknesses (thin, medium, thick). The colour swatches are Black, White, Blue, Green, Yellow and Red, Black first as on the iPhone. A line is drawn wherever a finger (or the mouse) drags over the picture. Undo and Redo step back and forward through lines drawn and erased. All of it happens in the editor, before Done.
11. **ME11** A line stays on what it marked. Its points and thickness are kept against the original picture (points as fractions of its size, thickness as a fraction of its shorter side) and simplified as it is drawn. Cropping or rotating afterwards leaves it on the same spot at the same size on the picture, and a part outside the crop isn't shown. The mapping, the thickness and the simplification are pure and unit-tested. A moment holds at most 50 lines; Draw says so and stops taking more at 50.
12. **ME12** On a video the drawing shows for the whole clip and never takes a tap from the player.

Text

13. **ME13** Text is today's caption bar (80 characters, dragged up and down), on photos as before and now on videos, where it shows for the whole clip and never takes a tap from the player. It sits against the edited frame.

Trim (videos)

14. **ME14** Trim shows a bar the length of the clip with a start and an end handle. Dragging either shows that moment of the video and the kept times ("0:02 – 0:09"). At least one second is kept.
15. **ME15** A trimmed video plays only the kept part everywhere: it starts at the start, and ends at the end, where the replay moves on as it does at a video's end today. Seeking outside the kept part is brought back into it.

Saving out

16. **ME16** Save to Photos (Download on the web) of an edited photo saves one JPEG with the crop, rotation, filter, drawing and caption, matching the screen. On phones it is at most 1600 px wide, as today.
17. **ME17** Save to Photos of an edited video saves one MP4 with the trim, crop, rotation, drawing and caption in it, with its sound. The web downloads a re-recorded video of the kept part (WebM or MP4, whichever the browser records), with sound. A video with no edits saves its original, as today.
18. **ME18** While a video is being made, the viewer shows "Saving…", and nothing else in the viewer can start another save. A failure says "The video could not be saved" and leaves no file behind.
19. **ME19** `exportPlan(source, edit)` is pure and unit-tested: the output size (even sides, the long side at most 1920 px for video), the source rectangle, the rotation and the overlay's size. Phones and the web follow it.

Previews, storage and accessibility

20. **ME20** After Done on a photo, its small copy is remade from the edited photo (crop, rotation, filter and drawing; no caption, as today), so pins and the memory preview show it. A copy remade later, because its file was gone, has the crop and rotation.
21. **ME21** Edits are one `edit` field on the capture. A missing, unreadable or newer-format value reads as no edits (the original shows) and never fails a screen. `parseEdit` and `serializeEdit` are pure and unit-tested, including a round trip. A saved edit and caption reach every open view of the walk through the capture bus.
22. **ME22** Every editor control has a label and a role. Rotate, the filters, the pen tools and thicknesses, the colours, Undo, Redo, Revert and the aspect choices work with a screen reader. Freehand drawing and dragging the crop frame have no screen-reader way (accepted, `docs/DEFERRED.md`).

After capture

23. **ME23** Right after a photo or video is kept, the place that took it offers Edit for 6 seconds, as the caption pill does today: the walk screen ("Photo saved here" or "Video saved here", replacing "Aa Caption" and the video's toast), Navigate's ready screen (a moment outside a walk) and the minimized walk's recording bar ("Photo saved to your walk" or "Video saved to your walk"). The button is `testID` `capture-edit`, label "Edit". A tap opens the editor on Crop for that capture; the walk screen's own viewer opens it as an overlay, the other two as a Modal of their own (none of them is inside another Modal). Taking another capture replaces the offer with the new one. Done there saves exactly as from the viewer (ME2, ME20, ME21).
