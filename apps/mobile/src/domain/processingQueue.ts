import { errorCode, processEntry } from './importPhoto';
import type { EntryRepository, PhotoProcessor, QueueCounts } from './records';

export interface QueueSnapshot extends QueueCounts {
  busy: boolean;
  requested: boolean;
  error: string | null;
  completed: number;
  requiresRestart: boolean;
}
export type SerialWork = <T>(action: () => Promise<T>) => Promise<T>;

/** SQLite owns durable jobs; this foreground worker holds only coordination/UI state. */
export function createProcessingQueue(
  repository: EntryRepository,
  processor: PhotoProcessor,
  serial: SerialWork,
) {
  let snapshot: QueueSnapshot = {
    queued: 0,
    running: 0,
    paused: 0,
    failed: 0,
    busy: false,
    requested: false,
    error: null,
    completed: 0,
    requiresRestart: false,
  };
  const listeners = new Set<() => void>();
  let foreground = true,
    requested = false,
    readVersion = 0;
  let pump: Promise<void> | undefined;
  function publish(patch: Partial<QueueSnapshot>) {
    snapshot = { ...snapshot, ...patch, requested };
    for (const listener of listeners) listener();
  }
  async function refresh() {
    const version = ++readVersion;
    try {
      const counts = await repository.queueCounts();
      if (version === readVersion) publish(counts);
    } catch (error) {
      if (version === readVersion) publish({ error: errorCode(error) });
    }
  }
  function kick(): Promise<void> {
    if (pump) return pump;
    if (!requested || !foreground) return Promise.resolve();
    pump = drain().finally(() => {
      pump = undefined;
      // A submission can arrive as an empty drain finishes.
      if (requested && foreground) void kick();
    });
    return pump;
  }
  async function drain() {
    try {
      while (requested && foreground) {
        const worked = await serial(async () => {
          if (!requested || !foreground) return false;
          const ticket = await repository.claimNext();
          if (!ticket) {
            requested = false;
            return false;
          }
          publish({ busy: true });
          await refresh();
          try {
            await processEntry(ticket, repository, processor);
            publish({ completed: snapshot.completed + 1 });
          } catch (error) {
            const current = await repository.get(ticket.id);
            if (current?.status === 'running') throw error;
            if (errorCode(error) === 'INSUFFICIENT_STORAGE') {
              requested = false;
              await repository.pauseQueued('storage');
              publish({ error: 'INSUFFICIENT_STORAGE' });
            }
            // Other per-image failures are persisted by processEntry; continue the next job.
          } finally {
            publish({ busy: false });
            await refresh();
          }
          return true;
        });
        if (!worked) break;
      }
    } catch (error) {
      requested = false;
      publish({ busy: false, error: errorCode(error), requiresRestart: true });
    } finally {
      await refresh();
    }
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    refresh,
    async start() {
      if (snapshot.requiresRestart) return;
      requested = true;
      publish({ error: null });
      if (!foreground) {
        try {
          await serial(() => repository.pauseQueued('background'));
        } catch (error) {
          requested = false;
          publish({ error: errorCode(error) });
        }
        await refresh();
        return;
      }
      await kick();
    },
    async resume() {
      if (snapshot.requiresRestart) return;
      requested = true;
      publish({ error: null });
      try {
        await serial(() => repository.resumePaused());
        if (!foreground) await serial(() => repository.pauseQueued('background'));
        await refresh();
        await kick();
      } catch (error) {
        requested = false;
        publish({ error: errorCode(error) });
      }
    },
    async pause() {
      requested = false;
      publish({});
      try {
        await serial(() => repository.pauseQueued('user'));
      } catch (error) {
        publish({ error: errorCode(error) });
      }
      await refresh();
    },
    async setForeground(active: boolean) {
      foreground = active;
      try {
        if (!active) await serial(() => repository.pauseQueued('background'));
        else if (requested) await serial(() => repository.resumePaused('background'));
        await refresh();
        if (active && requested) await kick();
      } catch (error) {
        requested = false;
        publish({ error: errorCode(error) });
      }
    },
  };
}
export type ProcessingQueue = ReturnType<typeof createProcessingQueue>;
