// Wraps the File System Access API (Chromium-only — Chrome/Edge/Opera).
// Lets the page read the user's own ~/.claude/projects folder directly,
// entirely client-side: no server, no upload, nothing leaves the browser.

const DB_NAME = 'claude-usage-fs'
const STORE_NAME = 'handles'
const HANDLE_KEY = 'claudeProjectsDir'

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function saveDirHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function clearSavedDirHandle(): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(HANDLE_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadSavedDirHandle(): Promise<FileSystemDirectoryHandle | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(HANDLE_KEY)
    req.onsuccess = () => resolve((req.result as FileSystemDirectoryHandle | undefined) ?? null)
    req.onerror = () => reject(req.error)
  })
}

// Must be called from inside a user gesture (e.g. a button onClick).
export async function pickClaudeProjectsDir(): Promise<FileSystemDirectoryHandle> {
  const handle = await window.showDirectoryPicker({ id: 'claude-projects', mode: 'read' })
  await saveDirHandle(handle)
  return handle
}

// Safe to call on mount — does not prompt the user.
export async function hasReadPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  return (await handle.queryPermission({ mode: 'read' })) === 'granted'
}

// Must be called from inside a user gesture.
export async function requestReadPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  return (await handle.requestPermission({ mode: 'read' })) === 'granted'
}

export interface JsonlFileRef {
  path: string
  handle: FileSystemFileHandle
}

export async function listJsonlFiles(root: FileSystemDirectoryHandle): Promise<JsonlFileRef[]> {
  const results: JsonlFileRef[] = []

  async function walk(dir: FileSystemDirectoryHandle, prefix: string) {
    for await (const [name, entry] of dir.entries()) {
      if (entry.kind === 'directory') {
        await walk(entry, `${prefix}/${name}`)
      } else if (name.endsWith('.jsonl')) {
        results.push({ path: `${prefix}/${name}`, handle: entry })
      }
    }
  }

  await walk(root, '')
  return results
}

export async function readFileText(ref: JsonlFileRef): Promise<string> {
  const file = await ref.handle.getFile()
  return file.text()
}
