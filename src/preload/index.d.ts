import type { MmzApi } from '../shared/types'

declare global {
  interface Window {
    mmz: MmzApi
  }
}

export {}
