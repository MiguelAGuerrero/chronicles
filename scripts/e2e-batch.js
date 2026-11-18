#!/usr/bin/env node
// Journeys side by side (the owner, Nov 18: "Run 3 in parallel"; docs/TESTING.md, "The e2e's economy").
//
//   npm run e2e:batch -- <journey> <journey> ...       three at a time against the dist/ already exported
//   npm run e2e:batch -- -j 2 <journey> ...            another width (4 cores here: three leaves the build room)
//
// Each journey is `E2E_ONLY=<name> node scripts/e2e-web.js`, in a fresh browser on a port of its own (the harness listens
// on port 0), with this process's environment (E2E_BASE, E2E_SHOTS, E2E_FORCE). The green cache holds as for one run:
// a journey already green on these inputs says so and is not run again. Each run's output goes to a file under
// --out (default a new temp folder); one line per journey is printed as it ends, then a summary, and the exit is 1
// when any journey failed. The summary is pure and exported for src/lib/__tests__/arch/e2eBatch.test.ts.

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

/** One journey's line, from its output and exit code. */
function summarize(name, out, code) {
  if (/already green on these inputs/.test(out)) return { name, state: 'green', line: `${name}: already green` };
  const ok = (out.match(/^ok - /gm) || []).length;
  const bad = out.match(/^not ok - (.*)$/m);
  if (code === 0 && !bad) return { name, state: 'pass', line: `${name}: pass (${ok} checks)` };
  const why = bad ? bad[1] : (out.trim().split('\n').filter(Boolean).pop() || `exit ${code}`);
  return { name, state: 'fail', line: `${name}: FAIL after ${ok} checks: ${why.slice(0, 200)}` };
}

function parseArgs(argv) {
  const o = { width: 3, out: null, names: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '-j') o.width = Math.max(1, Number(argv[++i]) || 3);
    else if (argv[i] === '--out') o.out = argv[++i];
    else o.names.push(argv[i]);
  }
  return o;
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (!o.names.length) {
    console.error('usage: npm run e2e:batch -- [-j 3] [--out <dir>] <journey> ...');
    process.exit(64);
  }
  const out = o.out || fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-batch-'));
  fs.mkdirSync(out, { recursive: true });
  const queue = [...o.names];
  const results = [];
  const runOne = (name) => new Promise((resolve) => {
    const file = path.join(out, `${name}.log`);
    const log = fs.createWriteStream(file);
    const t0 = Date.now();
    const child = spawn(process.execPath, [path.join(__dirname, 'e2e-web.js')], { env: { ...process.env, E2E_ONLY: name } });
    child.stdout.pipe(log, { end: false });
    child.stderr.pipe(log, { end: false });
    child.on('close', (code) => {
      log.end(() => {
        const r = summarize(name, fs.readFileSync(file, 'utf8'), code);
        console.log(`${r.line} [${Math.round((Date.now() - t0) / 1000)} s]`);
        results.push(r);
        resolve();
      });
    });
  });
  const lane = async () => { while (queue.length) await runOne(queue.shift()); };
  await Promise.all(Array.from({ length: Math.min(o.width, o.names.length) }, lane));
  const failed = results.filter((r) => r.state === 'fail');
  console.log(`e2e:batch: ${results.length - failed.length} of ${results.length} green; logs in ${out}`);
  process.exit(failed.length ? 1 : 0);
}

if (require.main === module) main();
module.exports = { summarize, parseArgs };
