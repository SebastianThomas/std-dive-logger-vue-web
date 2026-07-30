import axios from 'axios'

// Auth0 blocks every direct login grant (password, password-realm, client_credentials) for
// wetnotes.com's own app - only its hosted login widget works. So instead of logging in
// ourselves, the user pastes an access token they already obtained by logging into wetnotes.com
// normally (devtools -> Application/Storage -> localStorage -> access_token). Their password never
// touches this code at all - we only ever handle an already-issued token.
const DIVESOFT_API_BASE = 'https://divesoft-app.foxmedia.cz/api'

export type DivesoftDiveJson = Record<string, unknown>

/** Lists the ids of every dive in the account (does not include full telemetry). */
export async function listDivesoftDiveIds(token: string): Promise<string[]> {
  const { data } = await axios.get<{ items: { userDives: { id: string }[] } }>(
    `${DIVESOFT_API_BASE}/dives`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return data.items.userDives.map((d) => d.id)
}

/**
 * Lists the ids of dives shared with this account (not owned by it). wetnotes.com's own web app
 * has a separate `/app/shared-dives` route alongside `/app/dives`, so this assumes a mirroring
 * `GET /shared-dives` API endpoint with the same `{ items: { ... } }` shape as the own-dives
 * endpoint - **unverified against the real API** at the time of writing. Deliberately degrades to
 * an empty list (logging a warning) rather than throwing on any shape mismatch or error, so a
 * wrong guess here can only mean "no shared dives shown" instead of breaking the already-working
 * own-dives import.
 */
export async function listDivesoftSharedDiveIds(token: string): Promise<string[]> {
  try {
    const { data } = await axios.get<{ items?: { sharedDives?: { id: string }[] } }>(
      `${DIVESOFT_API_BASE}/shared-dives`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    const ids = data.items?.sharedDives?.map((d) => d.id)
    if (!ids) {
      console.warn(
        'Divesoft shared-dives response did not have the expected items.sharedDives shape - showing no shared dives.',
        data,
      )
    }
    return ids ?? []
  } catch (err) {
    console.warn(
      'Could not fetch Divesoft shared dives (the /shared-dives endpoint guess may not match the real API) - showing no shared dives.',
      err,
    )
    return []
  }
}

/** Fetches one dive's full raw JSON exactly as wetnotes.com/Divesoft returns it. */
export async function getDivesoftDive(token: string, id: string): Promise<DivesoftDiveJson> {
  const { data } = await axios.get<DivesoftDiveJson>(`${DIVESOFT_API_BASE}/dives/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return data
}

/**
 * Accepts either a bare dive id or a full `https://wetnotes.com/app/dives/{id}` URL and returns
 * just the id.
 */
export function extractDivesoftDiveId(input: string): string {
  const trimmed = input.trim()
  const match = trimmed.match(/\/app\/dives\/([^/?#]+)/)
  return match ? match[1]! : trimmed
}
