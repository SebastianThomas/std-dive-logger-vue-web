/** Thrown by `useApi` while the server can't be reached - never a sign the session is gone. */
export class OfflineError extends Error {
  constructor() {
    super("You're offline — this loads when you're back online.")
    this.name = 'OfflineError'
  }
}

export const isOfflineError = (err: unknown): err is OfflineError =>
  err instanceof OfflineError || (err instanceof Error && err.name === 'OfflineError')
