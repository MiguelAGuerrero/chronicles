// Saves refused on cue, for the journeys that hold a capture for Retry (space, unsaved): the media store's write is
// refused as out of quota while `window.__failMedia` counts down, and the moment store's while `window.__failMoment`
// does (a file kept, its row refused: specs/unsaved-captures UN12). Nothing else of IndexedDB changes.
async function failStorage(c) {
  await c.addInitScript(() => {
    window.__failMedia = 0;
    window.__failMoment = 0;
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'media' && window.__failMedia > 0) {
        window.__failMedia--;
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      }
      if (this.name === 'moment' && window.__failMoment > 0) {
        window.__failMoment--;
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      }
      return put.apply(this, args);
    };
    // A new moment's row is added, not put.
    const add = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (...args) {
      if (this.name === 'moment' && window.__failMoment > 0) {
        window.__failMoment--;
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      }
      return add.apply(this, args);
    };
  });
}

module.exports = { failStorage };
