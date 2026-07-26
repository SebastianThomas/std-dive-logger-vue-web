import { useApi } from '@/composables/useApi'
import { resolveImporterUrl } from '@/lib/globals/url/resolveUrl'
import axios from 'axios'

export type DivesoftDiveJson = Record<string, unknown>

/**
 * wetnotes.com's own (non-secret) Auth0 app config, fetched from our backend rather than
 * hardcoded here (it re-derives this from wetnotes.com's own page, so a future rotation on their
 * end doesn't silently break this importer). This never includes a user's own wetnotes.com
 * credentials - only the shared client app config.
 */
export type DivesoftConfig = {
  domain: string
  clientId: string
  clientSecret: string
  audience: string
  realm: string
  scope: string
  apiBaseUrl: string
}

export class DivesoftLoginError extends Error {}

export async function getDivesoftConfig(): Promise<DivesoftConfig> {
  const { getWithToken } = useApi()
  const { data } = await getWithToken<DivesoftConfig>(
    resolveImporterUrl('/v1/import/divesoft/config'),
  )
  return data
}

/**
 * Logs into wetnotes.com's Auth0 tenant directly from the browser, returns a bearer token. The
 * email/password never leave the browser for anywhere but Auth0 itself.
 */
export async function loginDivesoft(
  config: DivesoftConfig,
  email: string,
  password: string,
): Promise<string> {
  try {
    const { data } = await axios.post<{ access_token: string }>(
      `https://${config.domain}/oauth/token`,
      {
        grant_type: 'http://auth0.com/oauth/grant-type/password-realm',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        username: email,
        password: password,
        realm: config.realm,
        audience: config.audience,
        scope: config.scope,
      },
    )
    return data.access_token
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 403) {
      throw new DivesoftLoginError('Incorrect wetnotes.com email or password.')
    }
    throw new DivesoftLoginError('Could not sign in to wetnotes.com. Please try again.')
  }
}

/** Lists the ids of every dive in the account (does not include full telemetry). */
export async function listDivesoftDiveIds(
  config: DivesoftConfig,
  token: string,
): Promise<string[]> {
  const { data } = await axios.get<{ items: { userDives: { id: string }[] } }>(
    `${config.apiBaseUrl}dives`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return data.items.userDives.map((d) => d.id)
}

/** Fetches one dive's full raw JSON exactly as wetnotes.com/Divesoft returns it. */
export async function getDivesoftDive(
  config: DivesoftConfig,
  token: string,
  id: string,
): Promise<DivesoftDiveJson> {
  const { data } = await axios.get<DivesoftDiveJson>(`${config.apiBaseUrl}dives/${id}`, {
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
