# Fonts for the e2e's map text

`Noto Sans Bold/0-255.pbf` is OpenFreeMap's glyph file for Noto Sans Bold, Latin-1
(`https://tiles.openfreemap.org/fonts/Noto%20Sans%20Bold/0-255.pbf`, fetched Nov 12, 2026), the font the app's
busy-street names use (`BUSY_NAME_FONT`, explore-dense-city DC1). The harness serves it for every glyph range the map
asks, so the fake style's text draws without the network. Noto Sans is under the SIL Open Font License 1.1, which allows redistributing it with software on
condition that its copyright notice and the licence go with it: both are in `OFL.txt` beside this file (from
`notofonts/latin-greek-cyrillic`, fetched Nov 12, 2026; explore-dense-city audit 13).
