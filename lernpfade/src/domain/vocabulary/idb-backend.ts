import type { VocabBackend } from './storage.ts';

/**
 * IndexedDB-Speicher für VokabelPfad (nur im Browser).
 *
 * Eine eigene Datenbank mit genau einem Datensatz: dem serialisierten,
 * versionierten Zustand. Getrennt vom Demo-Deck (`localStorage`,
 * `lernpfade-review-state-v1`) und von allen anderen Daten der Seite.
 *
 * `compareAndWrite` läuft in EINER `readwrite`-Transaktion: IndexedDB
 * serialisiert überlappende Schreibtransaktionen aller Tabs einer Origin.
 * Zwischen dem Lesen der Revision und dem Schreiben kann deshalb kein
 * anderer Tab schreiben.
 */

export const VOCAB_DB_NAME = 'lernpfade-vokabeln';
export const VOCAB_DB_VERSION = 1;
export const VOCAB_OBJECT_STORE = 'daten';
export const VOCAB_RECORD_KEY = 'zustand';
/** Kanal, über den Tabs einander neue Speicherstände melden. */
export const VOCAB_CHANNEL = 'lernpfade-vokabeln';

function asRaw(value: unknown): string | null {
  if (value === undefined) return null;
  if (typeof value === 'string') return value;
  // Kein Text: als ungültig behandeln, Inhalt für die Sicherung erhalten.
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(VOCAB_DB_NAME, VOCAB_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(VOCAB_OBJECT_STORE)) db.createObjectStore(VOCAB_OBJECT_STORE);
    };
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(VOCAB_OBJECT_STORE)) {
        db.close();
        reject(new Error('object store missing'));
        return;
      }
      // Eine neuere Version in einem anderen Tab darf diese Verbindung schließen.
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error ?? new Error('open failed'));
    request.onblocked = () => reject(new Error('open blocked'));
  });
}

export function createIndexedDbBackend(factory: IDBFactory): VocabBackend {
  let connection: Promise<IDBDatabase> | null = null;
  const db = (): Promise<IDBDatabase> => {
    connection ??= openDatabase(factory).catch((error: unknown) => {
      connection = null;
      throw error;
    });
    return connection;
  };

  function run<T>(
    mode: IDBTransactionMode,
    work: (store: IDBObjectStore, done: (value: T) => void, fail: (error: unknown) => void) => void,
  ): Promise<T> {
    return db().then(
      (database) =>
        new Promise<T>((resolve, reject) => {
          let result: { value: T } | null = null;
          let failure: unknown = null;
          const tx = database.transaction(VOCAB_OBJECT_STORE, mode);
          tx.oncomplete = () => (result ? resolve(result.value) : reject(failure ?? new Error('no result')));
          tx.onabort = () => reject(failure ?? tx.error ?? new Error('transaction aborted'));
          tx.onerror = () => {
            failure ??= tx.error;
          };
          try {
            work(
              tx.objectStore(VOCAB_OBJECT_STORE),
              (value) => {
                result = { value };
              },
              (error) => {
                failure = error;
                tx.abort();
              },
            );
          } catch (error) {
            failure = error;
            tx.abort();
          }
        }),
    );
  }

  return {
    read: () =>
      run<string | null>('readonly', (store, done) => {
        const request = store.get(VOCAB_RECORD_KEY);
        request.onsuccess = () => done(asRaw(request.result));
      }),

    compareAndWrite: (isCurrent, serialized) =>
      run<'written' | 'conflict'>('readwrite', (store, done, fail) => {
        const request = store.get(VOCAB_RECORD_KEY);
        request.onsuccess = () => {
          if (!isCurrent(asRaw(request.result))) {
            done('conflict');
            return;
          }
          try {
            store.put(serialized, VOCAB_RECORD_KEY);
            done('written');
          } catch (error) {
            fail(error);
          }
        };
      }),

    remove: () =>
      run<void>('readwrite', (store, done) => {
        store.delete(VOCAB_RECORD_KEY);
        done(undefined);
      }),
  };
}

/** IndexedDB dieses Browsers, oder `null`, wenn sie nicht verfügbar ist. */
export function browserBackend(): VocabBackend | null {
  try {
    if (typeof window === 'undefined' || !window.indexedDB) return null;
    return createIndexedDbBackend(window.indexedDB);
  } catch {
    return null;
  }
}
