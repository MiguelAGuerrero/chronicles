# 0212. The drive in the outing: four parts specced together, and a safety rule for rides

Date: 2026-11-18 · Status: accepted, relayed · Area: product, vision, rides, replay, finding, capture, native · Builds on [0203](0203-the-session-is-an-outing.md), [0209](0209-the-road-engine.md), [0211](0211-spoken-turns-with-expo-speech.md)

## Context
In another session the owner asked for "just enough support so that if the user wants to capture their drive as part of the journey
itself, they can", "not to compete with Apple Maps, Waze, or any of the big scale navigation apps". That session ran the vision gate
(aligned if reshaped, eleven criteria) and handed the work here. Everything below reached this session as that session's account of
the owner's answers; in this session the owner said "Proceed" to speccing it.

## Decision
The owner's calls as relayed, Nov 18:
- All four parts, specced now: start a journey in the car; places found from the road; the drive in the replay; captures while driving.
- "Keep 0209": the road engine's full directions stand.
- A large place driven to is found by "arriving at it", judged against its outline or entrance, never a point; time on foot there
  with no capture "names it; a capture finds it".
- A safety rule for the vision page: "Nothing on a ride asks for a look or a tap."
- The session's name follows the outing work (0203).

The spec is `specs/drive-in-the-outing/spec.md` (DO1-DO30). The gate's "no route or turn for the road" is withdrawn by "Keep 0209".

## Consequences
- Nothing is built. The spec waits for the owner's review, and four questions in it are theirs: the safety rule against the spoken
  turn and the taps on the guiding bar; where outlines come from; how long on foot names a place; the scope of hands-free capture.
- Places from the road needs outlines or entrances in the chronicles-data pack, a contract change.
- The safety rule is not on `docs/VISION.md` yet (the page is at its size budget): the owner's edit.
- It amends rides R10 (the four-second squeeze) and DW14 (nothing offered past 10 km) when it lands.
