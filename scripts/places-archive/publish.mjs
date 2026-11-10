#!/usr/bin/env node
// The weekly job's last step (Places worth the stop, PW19, decision 0103): publish a newly built archive only when
// it differs from the current release's, so the weekly build is also the check for changes. Run by the
// chronicles-data workflow:
//
//   node scripts/places-archive/publish.mjs --region us --archive out/places-us-20261108.pmtiles
//        [--changes out/changes-us-20261108.json] --manifest-url https://…/manifest.json
//
// Prints `publish=true|false` and the reason, for the workflow to read.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

/**
 * PW19, SB5: whether to publish, from the built archive's SHA-256 (null when the build made none), the hash of its
 * place rows, and the live manifest. When both sides carry a places hash, only the places decide: routine bytes
 * that changed with the same places publish nothing (a staged places build, decision 0110).
 */
export function decide({ region, sha256, placesSha = null, manifest, unreachable = false }) {
  if (!sha256) return { publish: false, reason: 'no archive built' };
  // One network error must not publish a duplicate (places-worth-the-stop audit 7): only a real 404 is no manifest.
  if (unreachable) return { publish: false, reason: 'manifest unreachable' };
  if (!manifest) return { publish: true, reason: 'no manifest yet' };
  const current = (manifest.regions ?? []).find((r) => r.id === region)?.current;
  if (!current) return { publish: true, reason: 'new region' };
  const same = placesSha && current.places_sha256 ? current.places_sha256 === placesSha : current.sha256 === sha256;
  return same ? { publish: false, reason: 'unchanged' } : { publish: true, reason: 'changed' };
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
  const changes = arg('changes');
  const placesSha = changes && existsSync(changes) ? JSON.parse(readFileSync(changes, 'utf8')).places_sha256 ?? null : null;
  let manifest = null;
  let unreachable = false;
  try {
    const res = await fetch(url);
    if (res.ok) manifest = await res.json();
    else if (res.status !== 404) unreachable = true;
  } catch {
    unreachable = true;
  }
  const d = decide({ region, sha256, placesSha, manifest, unreachable });
  console.log(`publish=${d.publish}`);
  console.log(`reason=${d.reason}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
