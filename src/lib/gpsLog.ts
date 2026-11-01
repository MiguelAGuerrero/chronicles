import type { Capture, TracePoint } from './types';

/**
 * A walk's raw location readings as plain text, for the owner to paste when
 * the trace or the dot look wrong (the GPS log, Nov 1). Everything the phone
 * reported, unfiltered: seconds from the start, position, its reported
 * accuracy, speed and course. Captures are listed with where they were placed.
 * Nothing is sent anywhere: the walk's options hand the text to the share sheet.
 */
export function gpsLog(o: { startedAt: number; points: TracePoint[]; captures?: Capture[]; userAgent?: string }): string {
  const s = (t: number) => ((t - o.startedAt) / 1000).toFixed(1);
  const n = (v: number | null | undefined, d: number) => (v == null || !Number.isFinite(v) ? '' : v.toFixed(d));
  const lines = [
    `# Chronicles GPS log · walk started ${new Date(o.startedAt).toISOString()} · ${o.points.length} readings`,
    ...(o.userAgent ? [`# ${o.userAgent}`] : []),
    's,lat,lon,accuracy_m,speed_ms,course',
    ...[...o.points].sort((a, b) => a.t - b.t).map((p) => [s(p.t), n(p.lat, 6), n(p.lon, 6), n(p.accuracy_m, 1), n(p.speed, 2), n(p.course, 0)].join(',')),
  ];
  const caps = (o.captures ?? []).filter((c) => c.lat != null && c.lon != null);
  if (caps.length) {
    lines.push('# captures: s,lat,lon,kind');
    for (const c of [...caps].sort((a, b) => a.t - b.t)) lines.push(`# ${s(c.t)},${n(c.lat, 6)},${n(c.lon, 6)},${c.kind}`);
  }
  return lines.join('\n');
}
