// node compare.js NAME=file1,file2,... NAME2=...   one line per variant and throttle: the run with the median fps
// of those given, and the fps of every run.
const fs = require('fs');
for (const arg of process.argv.slice(2)) {
  const [name, list] = arg.split('=');
  const runs = list.split(',').flatMap((f) => { const o = JSON.parse(fs.readFileSync(f, 'utf8')); return o.runs.map((r) => ({ ...r, dsf: o.dsf, file: f })); });
  for (const rate of [...new Set(runs.map((r) => r.rate))].sort((a, b) => a - b)) {
    const rs = runs.filter((r) => r.rate === rate).sort((a, b) => a.raf.fps - b.raf.fps);
    const r = rs[Math.floor((rs.length - 1) / 2)];
    const all = r.perSec.all;
    const setData = Object.entries(all).filter(([k]) => k.startsWith('setData')).reduce((a, [, v]) => a + v, 0);
    const script = r.main.ScriptDuration;
    const lag = r.lagPx && r.lagPx.fast;
    const lagRun = rs.find((x) => x.lagPx);
    const L = lagRun && lagRun.lagPx.fast;
    console.log([
      `${name} dsf${r.dsf} ${rate}x`, `beat ${r.seconds.all}s`, `fps ${r.raf.fps} [${rs.map((x) => x.raf.fps).join(', ')}]`,
      `rAF ${r.raf.all.p50}/${r.raf.all.p90}/${r.raf.all.p99}/${r.raf.all.max}`, `>33 ${r.raf.all.over33}% >50 ${r.raf.all.over50}% >100 ${r.raf.all.over100}%`,
      `commits ${r.commitsPerSec.app.all}`, `mapRenders ${all['render:map'] ?? 0}`, `jumpTo ${all.camera ?? 0}`, `setData ${setData.toFixed(1)}`, `reveal ${all.reveal ?? 0}`, `loop ${all['replay:loop'] ?? '-'}`,
      `msgs ${r.workerPerSec.total.all}`, `long ${r.longTasks.n}/${r.longTasks.totalMs}ms`,
      `script ${script}% = ${(script * 10 / r.raf.fps).toFixed(1)} ms per rAF frame`, `task ${r.main.TaskDuration}%`,
      L ? `lag fast (${L.seconds}s, ${L.walkerPxPerSec.p50}px/s): trace sent ${L.traceSent.p50}/${L.traceSent.p90} onMap ${L.traceOnMap.p50}/${L.traceOnMap.p90} dot ${L.dotOnMap.p50}/${L.dotOnMap.p90}` : '',
    ].join(' | '));
  }
}
