import { apiClient } from './client'

export interface Holiday {
  id: string
  holidayDate: string
  name: string
  createdAt: string
}

export interface CreateHolidayPayload {
  holidayDate: string
  name: string
}

export const holidayApi = {
  list: async (): Promise<Holiday[]> => {
    const res = await apiClient.get<{ data: Holiday[] }>('/holidays')
    return res.data.data ?? []
  },

  create: async (payload: CreateHolidayPayload): Promise<Holiday> => {
    const res = await apiClient.post<{ data: Holiday }>('/holidays', payload)
    return res.data.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/holidays/${id}`)
  },
}
