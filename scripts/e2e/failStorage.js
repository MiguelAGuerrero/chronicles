// Saves refused on cue, for the journeys that hold a capture for Retry (space, unsaved): the media store's write is
// refused as out of quota while `window.__failMedia` counts down, and the moment store's while `window.__failMoment`
// does (a file kept, its row refused: specs/unsaved-captures UN12), and the walk store's while `window.__failWalk`
// does (a Stop that fails, unsaved-captures audit 4). `window.__slowBlob` ms holds back reading a picked file, so a
// save is still under way when a Stop is held (audit 3). Nothing else of IndexedDB changes.
async function failStorage(c) {
  await c.addInitScript(() => {
    window.__failMedia = 0;
    window.__failMoment = 0;
    window.__failWalk = 0;
    window.__slowBlob = 0;
    const fetchOwn = window.fetch;
    window.fetch = async function (input, ...rest) {
      const url = typeof input === 'string' ? input : input?.url ?? '';
      if (url.startsWith('blob:') && window.__slowBlob > 0) {
        const ms = window.__slowBlob;
        window.__slowBlob = 0;
        await new Promise((r) => setTimeout(r, ms));
      }
      return fetchOwn.call(this, input, ...rest);
    };
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
      if (this.name === 'walk' && window.__failWalk > 0) {
        window.__failWalk--;
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
