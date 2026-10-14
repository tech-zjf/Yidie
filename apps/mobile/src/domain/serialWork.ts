/** A rejected operation must not block later work on the same resource queue. */
export function createSerialWork() {
  let tail: Promise<unknown> = Promise.resolve();
  return function enqueue<T>(action: () => Promise<T>): Promise<T> {
    const pending = tail.then(action);
    tail = pending.catch(() => {});
    return pending;
  };
}
