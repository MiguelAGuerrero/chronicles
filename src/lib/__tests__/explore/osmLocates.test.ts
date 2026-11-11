import { test } from 'node:test';

// OpenStreetMap locates places (specs/osm-locates, OL1-OL12, decision 0142): one todo per criterion, written before the code.
// OL1-OL9 are proven in chronicles-data's build; the owner decides whether they stay here as todos or are recorded there.

test('OL1: a historic=monument element with no wikidata tag is in the pack as class monument, named or not', { todo: 'test first' }, () => {});
test('OL2: a historic=memorial element with a pinned memorial or monument value is in the pack as that value class', { todo: 'test first' }, () => {});
test('OL3: a value the table does not name is not in the pack, and a memorial with no value enters only when named', { todo: 'test first' }, () => {});
test('OL4: an unnamed place of the table types enters with no name, and a named one is never replaced by it', { todo: 'test first' }, () => {});
test('OL5: access=private|no and the demolished, razed and destroyed tags keep a place out, whichever source located it', { todo: 'test first' }, () => {});
test('OL6: the same place in OpenStreetMap and Wikidata is one place, within 50 m', { todo: 'test first' }, () => {});
test('OL7: the gate reads no source name and no count, and a pack feature keeps name, class, src and id', { todo: 'test first' }, () => {});
test('OL8: the build report lists what OpenStreetMap added, by area and class, before a pack is published', { todo: 'test first' }, () => {});
test('OL9: a place only OpenStreetMap knows enters with no second source confirming it, and the confirming adapter still removes a closed or gone one', { todo: 'test first' }, () => {});
test('OL10: the contract is version 3 and the app pinned copy holds its class table and reader to it', { todo: 'test first' }, () => {});
test('OL11: an unnamed archive place is a mark of its class kind, and the card says what it is in words, never a count', { todo: 'test first' }, () => {});
test('OL12: an OpenStreetMap-only obelisk in an archive tile is a mark within 60 m of a capture, and finds it', { todo: 'test first' }, () => {});
