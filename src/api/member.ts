import { apiClient } from './client'

export interface Member {
  id: string
  name: string
  avatarColor: string
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface CreateMemberPayload {
  name: string
  avatarColor?: string
}

export interface SortOrderUpdate {
  id: string
  sortOrder: number
}

export const memberApi = {
  list: async (): Promise<Member[]> => {
    const res = await apiClient.get<{ data: Member[] }>('/members')
    return res.data.data ?? []
  },

  create: async (payload: CreateMemberPayload): Promise<Member> => {
    const res = await apiClient.post<{ data: Member }>('/members', payload)
    return res.data.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/members/${id}`)
  },

  reorder: async (orders: SortOrderUpdate[]): Promise<Member[]> => {
    const res = await apiClient.patch<{ data: Member[] }>('/members/reorder', { orders })
    return res.data.data ?? []
  },
}
