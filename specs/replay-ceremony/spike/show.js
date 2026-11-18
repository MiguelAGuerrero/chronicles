// node show.js <numbers.json>...  prints the numbers the report uses.
const fs = require('fs');
for (const f of process.argv.slice(2)) {
  const o = JSON.parse(fs.readFileSync(f, 'utf8'));
  console.log(`\n## ${f} (dsf ${o.dsf}, observe ${o.observe}, worker throttled ${o.workerThrottled})`);
  for (const r of o.runs) {
    const d = (x) => `p50 ${x.p50} p90 ${x.p90} p99 ${x.p99} max ${x.max} | >33 ${x.over33}% >50 ${x.over50}% >100 ${x.over100}% (n ${x.n})`;
    console.log(`\n### ${r.rate}x: path ${r.seconds.all} s (stretch ${r.seconds.stretch} s, photo card ${r.seconds.photo} s), fps ${r.raf.fps}`);
    console.log(`rAF all:     ${d(r.raf.all)}`);
    console.log(`rAF stretch: ${d(r.raf.stretch)}`);
    console.log(`rAF photo:   ${d(r.raf.photo)}`);
    console.log(`ticks: ${r.ticks.perSec}/s, mean gap ${r.ticks.meanGap} (stretch ${r.ticks.meanStretch}, photo ${r.ticks.meanPhoto}); all ${d(r.ticks.all)}; >250 ms ${r.ticks.over250}, clock lost ${r.ticks.clockLostMs} ms; tick self p50 ${r.ticks.selfMs.p50} max ${r.ticks.selfMs.max}`);
    console.log(`commits/s app ${JSON.stringify(r.commitsPerSec.app)} pins ${JSON.stringify(r.commitsPerSec.pins)}`);
    for (const k of ['all', 'stretch', 'photo']) console.log(`perSec ${k}: ${JSON.stringify(r.perSec[k])}`);
    const w = r.workerPerSec;
    console.log(`worker msgs/s: total ${JSON.stringify(w.total)}; LD stretch/photo: ${Object.entries(w).filter(([k, v]) => k.startsWith('LD:') && v.all >= 1).map(([k, v]) => `${k.slice(3)} ${v.stretch}/${v.photo}`).join(', ')}; tile reloads ${JSON.stringify(w['RT (all sources)'])}`);
    console.log(`round trip ms: points p50 ${r.roundTripMs.points.p50} p90 ${r.roundTripMs.points.p90}; trace p50 ${r.roundTripMs.trace.p50} p90 ${r.roundTripMs.trace.p90} | on map ms: points p50 ${r.onMapMs.points.p50} p90 ${r.onMapMs.points.p90}; trace p50 ${r.onMapMs.trace.p50} p90 ${r.onMapMs.trace.p90}; on a stretch: trace p50 ${r.onMapMs.traceStretch.p50} p90 ${r.onMapMs.traceStretch.p90}, points p50 ${r.onMapMs.pointsStretch.p50} p90 ${r.onMapMs.pointsStretch.p90}`);
    console.log(`long tasks: ${r.longTasks.n} (${r.longTasks.perSec}/s), ${r.longTasks.totalMs} ms = ${r.longTasks.share}% of the beat, max ${r.longTasks.max}; long frames ${r.longFrames.n}, ${r.longFrames.totalMs} ms`);
    console.log(`main thread: ${JSON.stringify(r.main)}; markers ${r.markers}`);
    if (r.styleWritesPerSec) console.log(`style writes/s: ${JSON.stringify(r.styleWritesPerSec)}`);
    if (r.lagPx) for (const k of ['fast', 'photo']) { const l = r.lagPx[k]; console.log(`lag px (${k}, ${l.seconds} s): walker ${l.walkerPxPerSec.p50} px/s (p90 ${l.walkerPxPerSec.p90}); trace as sent p50 ${l.traceSent.p50} p90 ${l.traceSent.p90} max ${l.traceSent.max}; trace on map p50 ${l.traceOnMap.p50} p90 ${l.traceOnMap.p90} max ${l.traceOnMap.max}; dot on map p50 ${l.dotOnMap.p50} p90 ${l.dotOnMap.p90} max ${l.dotOnMap.max}; px/m p50 ${l.pxPerMetre.p50}`); }
  }
}
