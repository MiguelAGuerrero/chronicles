<!-- Mirror of the Claude Docs tab "Motion (spec draft)" (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). The doc is the owner's authoring surface; this file is the greppable copy. When they differ, the doc wins and this file needs a re-export. Last exported: 2026-11-03. -->

# Motion: knowing when you're really walking

Nov 1, 2026 · @Miguel Guerrero

The phone's motion sensors decide whether you are walking, so GPS drift can't move the dot or the line while you stand still. GPS alone can't tell 10 m of drift over 5 s (2 m/s) from a walk; steps can.

## The owner's calls (Nov 1)

- **Use the motion sensors** (after the research: Google's location service and activity recognition, Map My Tracks and tracking libraries all add sensors or motion state to GPS). Indoors the owner's phone drew 100 m of spikes while they sat still.
- **Expo's own module, one path on every platform:** `expo-sensors` DeviceMotion streams acceleration on iPhone, Android and the web. Expo's Pedometer has no web build (its web module is a stub), so steps are found from acceleration in our own pure detector, the same everywhere.

## Criteria

Permission

1. **MO1** Start, Resume and Walk here ask for motion access from the same tap (iPhone web needs a tap; `DeviceMotion.requestPermissionsAsync`). It is asked once; a phone remembers the answer.
2. **MO2** Declined or unavailable (a desktop, Safari's Motion & Orientation Access off): the walk works as today, on the GPS filters alone. The walk's options say "Motion off: standing still may drift".

Telling walking from standing

3. **MO3** A pure detector reads the acceleration's size (gravity removed) and counts steps: peaks 0.3-1 s apart (1-3.3 steps a second) of at least the step threshold. Walking means 2 or more steps in the last 3 s; still means none for 3 s.
4. **MO4** On test signals: walking at 1.6-2.2 steps a second is found within 3 s; a phone held still, held in a hand with small jiggles, or tapped on while typing reads still; a bus's vibration (small, irregular) is not steps.

The live dot

5. **MO5** While still, the dot doesn't move, whatever the GPS reports, unless a fix lands farther than 3 times its accuracy for 3 fixes in a row (the phone was wrong when the stay began).
6. **MO6** When steps start, the dot moves within 2 s.
7. **MO7** While walking, a fix that would mean moving faster than 4 m/s from the dot is a jump, unless a ride is under way (rides are judged by GPS, as today).

The line, distance and streets

8. **MO8** Still spells are recorded with the walk, as its pauses are (start, end). Reading a trace holds fixes inside a still spell at one spot, however short the spell, so the line, distance and streets ignore drift there too.
9. **MO9** A ride is never cut by a still spell: sitting on a bus is still to the sensors, but the GPS's ride wins.

Cost and privacy

10. **MO10** Motion is read only while a walk is open and on screen; it stops on pause, stop, and when the page or app goes to the background. Nothing leaves the device.

## Data model (to confirm)

One new kept record, beside pauses: `still` (walk id, started at, ended at), SQLite migration 13, IndexedDB v11. Still spells are truth (a sensor record), never derived; `readTrace` takes them like pauses. Changing how they are read bumps `SNAP_RULES`.

## Deferred

- A pocketed phone app in the background: JavaScript sensors stop there. iOS can later fill still spells from the Pedometer's history (`getStepCountAsync` between two times) in the location task.
- Using step cadence for distance when GPS is lost (dead reckoning).

## Tests

- Unit: the detector (MO3, MO4) on synthetic acceleration; the dot with motion (MO5-MO7); `readTrace` with still spells, and a ride over one (MO8, MO9).
- e2e: the permission asked from Start's tap, and declined (MO1, MO2), with a stubbed `DeviceMotionEvent`; standing with stubbed stillness while the GPS wanders keeps the dot and line still (MO5, MO8).

Native (unverified on a device): DeviceMotion on iPhone and Android, migration 13.
