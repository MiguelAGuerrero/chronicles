/// <reference types="node" />
import { test } from 'node:test';

// Whole towns (specs/whole-towns, decision 0127): a town's page holds every neighborhood inside its border;
// the selected area's map shows every place still to find. Real cases run on Allentown
// (allentownHoods.json, cut by scripts/fixture-town-hoods.mjs).

test('WT1: a town\'s page lists every neighborhood inside its border, nearest you first, past 5 km and past 24', { todo: 'test first' }, () => {});
test('WT2: a neighborhood in a smaller town inside the border is that town\'s', { todo: 'test first' }, () => {});
test('WT3: a town with no border lists by its reach, at most 24', { todo: 'test first' }, () => {});
test('WT3: a failed border read lists nothing and is tried again', { todo: 'test first' }, () => {});
test('WT4: Allentown\'s listing read finds every neighbourhood point inside its border', { todo: 'test first' }, () => {});
test('WT5: a hamlet inside a border is a neighborhood; outside, none; placesFromTiles still has no hamlet', { todo: 'test first' }, () => {});
test('WT6: wards are not neighborhoods, on a town\'s page or near you; Wardsville is', { todo: 'test first' }, () => {});
test('WT7: every place still to find in the selected area is on the map, a town\'s too', { todo: 'test first' }, () => {});
test('WT8: the card\'s waiting is one per kind and no "?" carries a name', { todo: 'test first' }, () => {});
test('WT9: a town\'s page is listed once per build; a read by reach alone is listed again', { todo: 'test first' }, () => {});
test('WT10: Explore\'s map draws no found place', { todo: 'test first' }, () => {});
test('WT11: the "?" are one label naming the area and the kinds, the same for one or many', { todo: 'test first' }, () => {});
