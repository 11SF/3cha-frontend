import { useCallback, useEffect, useState } from 'react'
import {
  clearSavedDirHandle,
  hasReadPermission,
  isFileSystemAccessSupported,
  listJsonlFiles,
  loadSavedDirHandle,
  pickClaudeProjectsDir,
  readFileText,
  requestReadPermission,
} from './fsAccess'
import { parseTranscriptContent } from './parse'
import type { UsageEvent } from './types'

export type ClaudeUsageStatus =
  | 'unsupported' // not Chrome/Edge/Opera
  | 'checking' // reading IndexedDB on mount
  | 'disconnected' // no folder picked yet
  | 'needs-permission' // folder picked before, browser wants it re-confirmed
  | 'loading' // walking + parsing files
  | 'ready'
  | 'error'

export function useClaudeUsage() {
  const [status, setStatus] = useState<ClaudeUsageStatus>(
    isFileSystemAccessSupported() ? 'checking' : 'unsupported'
  )
  const [events, setEvents] = useState<UsageEvent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null)

  const loadFrom = useCallback(async (handle: FileSystemDirectoryHandle) => {
    setStatus('loading')
    setError(null)
    try {
      const files = await listJsonlFiles(handle)
      if (files.length === 0) {
        setError('ไม่พบไฟล์ .jsonl ในโฟลเดอร์นี้ — เลือกโฟลเดอร์ ~/.claude/projects ใหม่อีกครั้ง')
        setStatus('error')
        return
      }

      const parsed = await Promise.all(
        files.map(async (f) => parseTranscriptContent(await readFileText(f), f.path))
      )
      setEvents(parsed.flat())
      setStatus('ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'อ่านข้อมูลไม่สำเร็จ')
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    if (!isFileSystemAccessSupported()) return

    let cancelled = false
    ;(async () => {
      const saved = await loadSavedDirHandle()
      if (cancelled) return
      if (!saved) {
        setStatus('disconnected')
        return
      }

      setDirHandle(saved)
      if (await hasReadPermission(saved)) {
        await loadFrom(saved)
      } else {
        setStatus('needs-permission')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [loadFrom])

  // Must run inside a user gesture (button onClick) — opens the picker.
  const connect = useCallback(async () => {
    try {
      const handle = await pickClaudeProjectsDir()
      setDirHandle(handle)
      await loadFrom(handle)
    } catch (e) {
      // AbortError = user closed the picker without choosing — not a real error
      if (e instanceof DOMException && e.name === 'AbortError') return
      setError(e instanceof Error ? e.message : 'เลือกโฟลเดอร์ไม่สำเร็จ')
      setStatus('error')
    }
  }, [loadFrom])

  // Must run inside a user gesture — re-confirms permission on a previously
  // saved handle without re-opening the picker.
  const reconnect = useCallback(async () => {
    if (!dirHandle) return
    if (await requestReadPermission(dirHandle)) {
      await loadFrom(dirHandle)
    }
  }, [dirHandle, loadFrom])

  const refresh = useCallback(async () => {
    if (dirHandle) await loadFrom(dirHandle)
  }, [dirHandle, loadFrom])

  const disconnect = useCallback(async () => {
    await clearSavedDirHandle()
    setDirHandle(null)
    setEvents([])
    setError(null)
    setStatus('disconnected')
  }, [])

  return { status, events, error, connect, reconnect, refresh, disconnect }
}
