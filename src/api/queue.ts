import { apiClient } from './client'

export type QueueStatus = 'pending' | 'done' | 'skipped'

export interface QueueNext {
  memberName: string
  avatarColor: string
  queueDate: string
}

export interface QueueEntry {
  id: string
  queueDate: string
  status: QueueStatus
  memberId: string
  memberName: string
  avatarColor: string
  confluenceUrl?: string
  position: number
  totalMembers: number
  next?: QueueNext
}

export const queueApi = {
  // Returns null when today is a holiday / weekend (NO_MEETING_TODAY).
  getToday: async (): Promise<QueueEntry | null> => {
    const res = await apiClient.get<{ code: string; data: QueueEntry | null }>('/queue/today')
    return res.data.data ?? null
  },

  list: async (): Promise<QueueEntry[]> => {
    const res = await apiClient.get<{ data: QueueEntry[] }>('/queue')
    return res.data.data ?? []
  },

  markDone: async (id: string): Promise<QueueEntry> => {
    const res = await apiClient.patch<{ data: QueueEntry }>(`/queue/${id}/done`)
    return res.data.data
  },

  skip: async (id: string): Promise<QueueEntry> => {
    const res = await apiClient.patch<{ data: QueueEntry }>(`/queue/${id}/skip`)
    return res.data.data
  },

  reset: async (): Promise<{ message: string }> => {
    const res = await apiClient.post<{ message: string }>('/queue/reset')
    return res.data
  },
}
