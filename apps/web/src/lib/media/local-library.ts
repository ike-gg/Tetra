import type { Edit } from "./edit";
import type { MediaFile, MediaKind } from "./media-file";

// Recently edited files, kept only in this browser (IndexedDB). Originals and edit settings
// are stored, results never are: they're re-rendered from the settings.

export const LIBRARY_LIMIT = 10;

export type LibraryEntry = {
  key: string;
  fileName: string;
  kind: MediaKind;
  bytes: number;
  width: number;
  height: number;
  frames: number;
  hash: string;
  thumbnail: Blob | null;
  createdAt: number;
  openedAt: number;
};

export type SavedEdit = { edit: Edit; name: string; discord?: boolean };

type StoreName = "entries" | "files" | "edits";

const DB_NAME = "tetra-editor";
const STORES: StoreName[] = ["entries", "files", "edits"];

let database: Promise<IDBDatabase> | undefined;

const openDatabase = () => {
  database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      for (const store of STORES) request.result.createObjectStore(store);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  // A failed open (private mode, blocked storage) shouldn't stick for the whole session
  database.catch(() => {
    database = undefined;
  });
  return database;
};

const done = (transaction: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });

const read = async <T>(store: StoreName, key: string) => {
  const transaction = (await openDatabase()).transaction(store);
  const request = transaction.objectStore(store).get(key);
  await done(transaction);
  return request.result as T | undefined;
};

const readAll = async <T>(store: StoreName) => {
  const transaction = (await openDatabase()).transaction(store);
  const request = transaction.objectStore(store).getAll();
  await done(transaction);
  return request.result as T[];
};

const write = async (values: Partial<Record<StoreName, [string, unknown]>>) => {
  const stores = Object.keys(values) as StoreName[];
  const transaction = (await openDatabase()).transaction(stores, "readwrite");
  for (const store of stores) {
    const [key, value] = values[store] as [string, unknown];
    transaction.objectStore(store).put(value, key);
  }
  await done(transaction);
};

const removeAll = async (keys: string[]) => {
  if (keys.length === 0) return;
  const transaction = (await openDatabase()).transaction(STORES, "readwrite");
  for (const store of STORES) {
    for (const key of keys) transaction.objectStore(store).delete(key);
  }
  await done(transaction);
};

// When IndexedDB isn't available the editor still works for this visit, from memory
const memory = new Map<
  string,
  { blob: Blob; entry: LibraryEntry; saved: SavedEdit | null }
>();

const slugFromFileName = (fileName: string) =>
  fileName
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/, "");

const randomKey = () => Math.random().toString(36).slice(2, 8);

const sha256 = async (buffer: ArrayBuffer) => {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", buffer));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const THUMBNAIL_SIZE = 96;

// Small still for the recent list, so it never has to load the originals
const makeThumbnail = async (blob: Blob) => {
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, THUMBNAIL_SIZE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );
  } catch {
    return null;
  }
};

export const listLibrary = async () => {
  try {
    const entries = await readAll<LibraryEntry>("entries");
    return entries.sort((a, b) => b.openedAt - a.openedAt);
  } catch {
    return [...memory.values()].map(({ entry }) => entry);
  }
};

const uniqueKey = async (fileName: string, taken: Set<string>) => {
  const base = slugFromFileName(fileName) || randomKey();
  let key = base;
  for (let n = 2; taken.has(key); n++) key = `${base}-${n}`;
  return key;
};

// Saves the original and returns its key. The same file dropped again reopens its entry
// (and keeps its settings) instead of adding a copy.
export const saveToLibrary = async (blob: Blob, media: MediaFile, fileName: string) => {
  const hash = await sha256(media.buffer);
  const now = Date.now();

  try {
    const entries = await readAll<LibraryEntry>("entries");
    const existing = entries.find((entry) => entry.hash === hash);
    if (existing) {
      await write({ entries: [existing.key, { ...existing, openedAt: now }] });
      return existing.key;
    }

    const key = await uniqueKey(fileName, new Set(entries.map((entry) => entry.key)));
    const entry: LibraryEntry = {
      key,
      fileName,
      kind: media.kind,
      bytes: media.bytes,
      width: media.info.width,
      height: media.info.height,
      frames: media.info.frames,
      hash,
      thumbnail: await makeThumbnail(blob),
      createdAt: now,
      openedAt: now,
    };
    await write({ entries: [key, entry], files: [key, blob] });

    const stale = [...entries, entry]
      .sort((a, b) => b.openedAt - a.openedAt)
      .slice(LIBRARY_LIMIT)
      .map((old) => old.key);
    await removeAll(stale);
    return key;
  } catch {
    const key = await uniqueKey(fileName, new Set(memory.keys()));
    memory.set(key, {
      blob,
      saved: null,
      entry: {
        key,
        fileName,
        kind: media.kind,
        bytes: media.bytes,
        width: media.info.width,
        height: media.info.height,
        frames: media.info.frames,
        hash,
        thumbnail: null,
        createdAt: now,
        openedAt: now,
      },
    });
    return key;
  }
};

export const openFromLibrary = async (key: string) => {
  const fromMemory = memory.get(key);
  if (fromMemory) return fromMemory;

  try {
    const [entry, blob, saved] = await Promise.all([
      read<LibraryEntry>("entries", key),
      read<Blob>("files", key),
      read<SavedEdit>("edits", key),
    ]);
    if (!entry || !blob) return null;
    await write({ entries: [key, { ...entry, openedAt: Date.now() }] });
    return { entry, blob, saved: saved ?? null };
  } catch {
    return null;
  }
};

export const saveEdit = async (key: string, saved: SavedEdit) => {
  const fromMemory = memory.get(key);
  if (fromMemory) {
    fromMemory.saved = saved;
    return;
  }
  try {
    await write({ edits: [key, saved] });
  } catch {
    // Losing saved settings is acceptable; the editor keeps working
  }
};

export const removeFromLibrary = async (key: string) => {
  memory.delete(key);
  try {
    await removeAll([key]);
  } catch {
    // Nothing stored, nothing to remove
  }
};
