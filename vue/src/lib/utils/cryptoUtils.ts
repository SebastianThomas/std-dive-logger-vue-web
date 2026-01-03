export const generateId = (): string => {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }

    if (typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint32Array(4)
      crypto.getRandomValues(bytes)
      return Array.from(bytes, (b) => b.toString(16).padStart(8, '0')).join('-')
    }
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
