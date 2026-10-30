// Registers the background location task when the bundle loads, before the
// router evaluates any route. The OS can relaunch the app headless to deliver
// a location batch, and the task must already be defined when that happens.
import './src/lib/recorder';
import 'expo-router/entry';
