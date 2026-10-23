/* Ids of transactions saved a moment ago, so lists can flash them where
   they land. Kept outside the finance store: it is a short-lived visual cue,
   not data. Entries expire on their own. */

const HIGHLIGHT_MS = 4000;
const addedAt = new Map<string, number>();
const listeners = new Set<() => void>();
let version = 0;

function notify() {
  version += 1;
  listeners.forEach((listener) => listener());
}

export function markRecentlyAdded(ids: string[]) {
  if (!ids.length) return;

  const now = Date.now();
  ids.forEach((id) => addedAt.set(id, now));
  notify();

  window.setTimeout(() => {
    const cutoff = Date.now() - HIGHLIGHT_MS;
    let changed = false;
    addedAt.forEach((time, id) => {
      if (time <= cutoff) {
        addedAt.delete(id);
        changed = true;
      }
    });
    if (changed) notify();
  }, HIGHLIGHT_MS + 50);
}

export function isRecentlyAdded(id: string) {
  const time = addedAt.get(id);
  return time !== undefined && Date.now() - time < HIGHLIGHT_MS;
}

export function subscribeToRecentlyAdded(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getRecentlyAddedVersion() {
  return version;
}
