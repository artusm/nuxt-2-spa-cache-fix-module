import { Module } from '@nuxt/types'

export interface SpaCacheFixOptions {
  /**
   * Maximum number of entries in the SPA renderer cache.
   * Once the limit is reached, the least recently used entry is evicted.
   * @default 100
   */
  max?: number
}

declare const spaCacheFixModule: Module<SpaCacheFixOptions>

export default spaCacheFixModule
