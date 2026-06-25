// Minimal ambient types for the parts of the File System Access API that
// TypeScript's bundled DOM lib doesn't include yet (Chromium-only API).
// See: https://wicg.github.io/file-system-access/

interface FileSystemHandlePermissionDescriptor {
  mode?: 'read' | 'readwrite'
}

interface FileSystemHandle {
  queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<'granted' | 'denied' | 'prompt'>
  requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<'granted' | 'denied' | 'prompt'>
}

interface DirectoryPickerOptions {
  id?: string
  mode?: 'read' | 'readwrite'
  startIn?: FileSystemHandle | string
}

interface Window {
  showDirectoryPicker(options?: DirectoryPickerOptions): Promise<FileSystemDirectoryHandle>
}
