/** Registered platform adapters keyed by platform id. */
import type { MediaPlatformDescriptor, MediaPlatformId } from '../types.ts'
import type { MediaPlatformAdapter } from './types.ts'

const PLATFORM_ID = /^[a-z][a-z0-9-]{0,39}$/

/** Platform adapters in registration order; ids are unique while registered. */
export class MediaAdapterRegistry {
  private readonly adapters = new Map<MediaPlatformId, MediaPlatformAdapter>()

  /**
   * Add one adapter.
   * @param adapter - adapter whose id is not yet registered.
   * @returns a disposer that removes exactly this registration.
   * @throws {Error} when the id is malformed, already registered, or a scraping descriptor has no `scrape`.
   */
  register(adapter: MediaPlatformAdapter): () => void {
    const { id } = adapter.descriptor
    if (!PLATFORM_ID.test(id)) throw new Error(`media-suite: platform id "${id}" must match ${PLATFORM_ID.source}`)
    if (this.adapters.has(id)) throw new Error(`media-suite: platform "${id}" is already registered`)
    if (adapter.descriptor.scrape && adapter.scrape === undefined) {
      throw new Error(`media-suite: platform "${id}" declares scrape but implements no scrape()`)
    }
    this.adapters.set(id, adapter)
    return () => {
      if (this.adapters.get(id) === adapter) this.adapters.delete(id)
    }
  }

  /**
   * Look up one adapter.
   * @param id - platform id.
   * @returns the adapter, or undefined.
   */
  get(id: MediaPlatformId): MediaPlatformAdapter | undefined {
    return this.adapters.get(id)
  }

  /**
   * List descriptors.
   * @returns descriptors in registration order.
   */
  descriptors(): MediaPlatformDescriptor[] {
    return [...this.adapters.values()].map(adapter => ({ ...adapter.descriptor, search: adapter.search !== undefined }))
  }
}
