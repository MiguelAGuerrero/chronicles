#!/usr/bin/env node
// The weekly job's last step (Places worth the stop, PW19, decision 0102): publish a newly built archive only when
// it differs from the current release's, so the weekly build is also the check for changes. Run by the
// chronicles-data workflow:
//
//   node scripts/places-archive/publish.mjs --region us --archive out/places-us-20261108.pmtiles --manifest-url https://…/manifest.json
//
// Prints `publish=true|false` and the reason, for the workflow to read.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

/** PW19: whether to publish, from the built archive's SHA-256 (null when the build made none) and the live manifest. */
export function decide({ region, sha256, manifest }) {
  if (!sha256) return { publish: false, reason: 'no archive built' };
  if (!manifest) return { publish: true, reason: 'no manifest yet' };
  const current = (manifest.regions ?? []).find((r) => r.id === region)?.current;
  if (!current) return { publish: true, reason: 'new region' };
  return current.sha256 === sha256 ? { publish: false, reason: 'unchanged' } : { publish: true, reason: 'changed' };
}

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : null;
}

async function main() {
  const region = arg('region');
  const archive = arg('archive');
  const url = arg('manifest-url');
  const sha256 = archive && existsSync(archive) ? createHash('sha256').update(readFileSync(archive)).digest('hex') : null;
  let manifest = null;
  try {
    const res = await fetch(url);
    if (res.ok) manifest = await res.json();
  } catch {
    manifest = null;
  }
  const d = decide({ region, sha256, manifest });
  console.log(`publish=${d.publish}`);
  console.log(`reason=${d.reason}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
