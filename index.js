// Registers the background location task when the bundle loads, before the
// router evaluates any route. The OS can relaunch the app headless to deliver
// a location batch, and the task must already be defined when that happens.
import './src/lib/recorder';
// Every caught error from here on is written to the diagnostics log (decision 0179), background task included.
import './src/lib/diagnostics';
import 'expo-router/entry';
