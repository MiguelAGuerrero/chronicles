#!/usr/bin/env node
// Place search (specs/place-search, GZ12, GZ13): builds the gazetteer pack (src/lib/gazetteer/pack.ts) from GeoNames's tab files
// (CC BY 4.0, geonames.org). The app never reads GeoNames's format: another dataset gets its own script that writes the same pack.
//
//   curl -O https://download.geonames.org/export/dump/{cities5000.zip,admin1CodesASCII.txt,countryInfo.txt}; unzip cities5000.zip
//   node scripts/build-gazetteer.js cities5000.txt admin1CodesASCII.txt countryInfo.txt assets/gazetteer/places.json [YYYY-MM-DD]
//
// Kept for each place: its name, its ASCII name, its region (admin1) and country names, its point (1e-4 degrees), and every ASCII
// alternate name that looks like a name (capitalised, no digits, at most 40 characters), by no size test. A population, a rank
// and a feature class are read by nobody and written nowhere: the pack cannot order or show a size (GZ13).
const fs = require('fs');

const plain = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const isName = (a) => /^[A-Z][\x20-\x7e]*$/.test(a) && !/\d/.test(a) && a.length <= 40;

function packFromGeoNames(cities, admin1Text, countryText, id) {
  const regionName = new Map();
  for (const line of admin1Text.split('\n')) {
    const [code, name] = line.split('\t');
    if (code && name) regionName.set(code, name);
  }
  const countryName = new Map();
  for (const line of countryText.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const f = line.split('\t');
    if (f[0] && f[4]) countryName.set(f[0], f[4]);
  }
  const date = /\d{4}-\d{2}-\d{2}$/.exec(id)?.[0] ?? id;
  const pack = {
    id,
    credit: `Place names: GeoNames (geonames.org), CC BY 4.0, ${date}`,
    names: [], ascii: [], alts: [], region: [], country: [], lat: [], lon: [], regions: [], regionCodes: [], countries: [],
  };
  const regionIx = new Map();
  const countryIx = new Map();
  const ix = (map, list, v) => {
    if (!map.has(v)) { map.set(v, list.length); list.push(v); }
    return map.get(v);
  };
  for (const line of cities.split('\n')) {
    if (!line) continue;
    const f = line.split('\t');
    const [, name, ascii, alternates, lat, lon, , , cc, , a1] = f;
    if (!name || !Number.isFinite(parseFloat(lat)) || !Number.isFinite(parseFloat(lon))) continue;
    const seen = new Set([plain(name), plain(ascii || name)]);
    const alts = [];
    for (const a of (alternates || '').split(',')) {
      if (!a || !isName(a) || seen.has(plain(a))) continue;
      seen.add(plain(a));
      alts.push(a);
    }
    pack.names.push(name);
    pack.ascii.push(ascii || name);
    pack.alts.push(alts);
    const rkey = `${cc}.${a1}`;
    if (!regionIx.has(rkey)) {
      regionIx.set(rkey, pack.regions.length);
      pack.regions.push(regionName.get(rkey) ?? '');
      pack.regionCodes.push(/^[A-Za-z]{1,3}$/.test(a1 || '') ? a1.toUpperCase() : '');
    }
    pack.region.push(regionIx.get(rkey));
    pack.country.push(ix(countryIx, pack.countries, countryName.get(cc) ?? cc));
    pack.lat.push(Math.round(parseFloat(lat) * 1e4));
    pack.lon.push(Math.round(parseFloat(lon) * 1e4));
  }
  return pack;
}

module.exports = { packFromGeoNames };

if (require.main === module) {
  const [cities, admin1, countries, out, date = new Date().toISOString().slice(0, 10)] = process.argv.slice(2);
  if (!cities || !admin1 || !countries || !out) {
    console.error('usage: build-gazetteer.js <cities5000.txt> <admin1CodesASCII.txt> <countryInfo.txt> <out.json> [YYYY-MM-DD]');
    process.exit(1);
  }
  const read = (p) => fs.readFileSync(p, 'utf8');
  const pack = packFromGeoNames(read(cities), read(admin1), read(countries), `geonames-cities5000-${date}`);
  const json = JSON.stringify(pack);
  fs.mkdirSync(require('path').dirname(out), { recursive: true });
  fs.writeFileSync(out, json);
  console.log(`${pack.names.length} places, ${(json.length / 1e6).toFixed(2)} MB, ${pack.id}`);
  // The web serves its own copy from public/ (fetched on first search): refresh it with the app's pack, or the web keeps the old one.
  const appPack = require('path').join(__dirname, '..', 'assets', 'gazetteer', 'places.json');
  if (require('path').resolve(out) === appPack) require('./copy-maplibre-worker.js');
}
