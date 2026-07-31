/**
 * A small fixed-capacity least-recently-used cache backed by a `Map` (which preserves insertion
 * order, so the oldest entry is always whichever key was least recently touched). Used for
 * per-dive-id caches on components that outlive a single dive (e.g. the main graph and ascent
 * rate panel keep the same instance across dive-to-dive navigation within a session) - without a
 * cap, those caches would otherwise retain every dive ever viewed for the lifetime of the tab.
 */
export class LruCache<K, V> {
  private readonly map = new Map<K, V>()

  constructor(private readonly maxEntries: number) {}

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined
    // Move to the end (most-recently-used) on read too, not just on write, so a cache that's
    // repeatedly re-read (e.g. flipping back and forth between a couple of recent dives) doesn't
    // evict those entries just because they haven't been re-fetched recently.
    const value = this.map.get(key)!
    this.map.delete(key)
    this.map.set(key, value)
    return value
  }

  has(key: K): boolean {
    return this.map.has(key)
  }

  set(key: K, value: V): void {
    // Re-inserting moves the key to the end (most-recently-used) in Map's iteration order.
    this.map.delete(key)
    this.map.set(key, value)
    if (this.map.size > this.maxEntries) {
      const oldestKey = this.map.keys().next().value
      if (oldestKey !== undefined) this.map.delete(oldestKey)
    }
  }
}
