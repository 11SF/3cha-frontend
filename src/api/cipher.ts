import { apiClient } from './client'

export interface CipherPayload {
  text: string
  key: string
}

export const cipherApi = {
  encrypt: async (payload: CipherPayload): Promise<string> => {
    const res = await apiClient.post<{ data: { result: string } }>('/cipher/encrypt', payload)
    return res.data.data.result
  },

  decrypt: async (payload: CipherPayload): Promise<string> => {
    const res = await apiClient.post<{ data: { result: string } }>('/cipher/decrypt', payload)
    return res.data.data.result
  },
}
